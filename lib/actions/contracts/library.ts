"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ClauseCategory, ContractType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { audit } from "@/lib/audit";

// --- Templates -------------------------------------------------------------

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  type: z.enum(ContractType),
  body: z.string().min(1, "Body is required"),
  jurisdiction: z.string().nullish(),
});

export type TemplateInput = z.input<typeof templateSchema>;
export type LibraryResult = { error?: string; id?: string };

export async function saveTemplate(input: TemplateInput): Promise<LibraryResult> {
  await requireCapability("contracts:write");
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid template" };
  }
  const p = parsed.data;
  const data = {
    name: p.name,
    type: p.type,
    body: p.body,
    jurisdiction: p.jurisdiction ?? null,
  };
  const saved = p.id
    ? await prisma.contractTemplate.update({ where: { id: p.id }, data })
    : await prisma.contractTemplate.create({ data });
  revalidatePath("/contracts/templates");
  return { id: saved.id };
}

export async function archiveTemplate(id: string, archived: boolean) {
  await requireCapability("contracts:write");
  await prisma.contractTemplate.update({ where: { id }, data: { archived } });
  revalidatePath("/contracts/templates");
}

// --- Clauses -----------------------------------------------------------------

const clauseSchema = z.object({
  id: z.string().optional(),
  jurisdiction: z.string().min(1, "Jurisdiction is required (ISO code or *)"),
  category: z.enum(ClauseCategory),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  mandatory: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type ClauseInput = z.input<typeof clauseSchema>;

export async function saveClause(input: ClauseInput): Promise<LibraryResult> {
  const user = await requireCapability("contracts:write");
  const parsed = clauseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid clause" };
  }
  const p = parsed.data;
  const jurisdiction = p.jurisdiction.trim() === "*" ? "*" : p.jurisdiction.trim().toUpperCase();
  const data = {
    jurisdiction,
    category: p.category,
    title: p.title,
    body: p.body,
    mandatory: p.mandatory,
    sortOrder: p.sortOrder,
  };

  let id: string;
  if (p.id) {
    // Edits bump the version and clear counsel review — reworded text must
    // be re-reviewed.
    const existing = await prisma.clause.findUnique({ where: { id: p.id } });
    if (!existing) return { error: "Clause not found" };
    const changed = existing.body !== p.body || existing.title !== p.title;
    await prisma.clause.update({
      where: { id: p.id },
      data: {
        ...data,
        ...(changed
          ? { version: existing.version + 1, reviewedBy: null, reviewedAt: null }
          : {}),
      },
    });
    id = p.id;
  } else {
    const created = await prisma.clause.create({ data });
    id = created.id;
  }
  await audit(user, "clause.save", "Clause", id, { title: p.title, jurisdiction });
  revalidatePath("/contracts/clauses");
  return { id };
}

export async function markClauseReviewed(id: string, reviewedBy: string) {
  const user = await requireCapability("contracts:write");
  await prisma.clause.update({
    where: { id },
    data: { reviewedBy: reviewedBy || user.name || "reviewed", reviewedAt: new Date() },
  });
  await audit(user, "clause.review", "Clause", id, { reviewedBy });
  revalidatePath("/contracts/clauses");
}

export async function archiveClause(id: string, archived: boolean) {
  await requireCapability("contracts:write");
  await prisma.clause.update({ where: { id }, data: { archived } });
  revalidatePath("/contracts/clauses");
}
