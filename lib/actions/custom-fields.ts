"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CustomFieldEntity, CustomFieldType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "field";
}

const schema = z.object({
  id: z.string().optional(),
  entity: z.enum(["CLIENT", "INVOICE"]),
  label: z.string().min(1, "Label is required"),
  type: z.enum(["TEXT", "NUMBER", "DATE", "SELECT"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

export type FieldDefInput = z.infer<typeof schema>;
export type FieldDefResult = { error?: string; ok?: boolean };

export async function saveFieldDef(input: FieldDefInput): Promise<FieldDefResult> {
  await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid field" };
  }
  const f = parsed.data;
  const options =
    f.type === "SELECT" ? (f.options ?? []).map((s) => s.trim()).filter(Boolean) : [];

  if (f.id) {
    await prisma.customFieldDefinition.update({
      where: { id: f.id },
      data: { label: f.label, type: f.type as CustomFieldType, options, required: !!f.required },
    });
  } else {
    // Ensure a unique key within the entity.
    let key = slugify(f.label);
    const existing = await prisma.customFieldDefinition.findMany({
      where: { entity: f.entity as CustomFieldEntity },
      select: { key: true, sortOrder: true },
    });
    const keys = new Set(existing.map((e) => e.key));
    if (keys.has(key)) {
      let i = 2;
      while (keys.has(`${key}_${i}`)) i++;
      key = `${key}_${i}`;
    }
    const maxSort = existing.reduce((m, e) => Math.max(m, e.sortOrder), -1);
    await prisma.customFieldDefinition.create({
      data: {
        entity: f.entity as CustomFieldEntity,
        key,
        label: f.label,
        type: f.type as CustomFieldType,
        options,
        required: !!f.required,
        sortOrder: maxSort + 1,
      },
    });
  }

  revalidatePath("/settings/custom-fields");
  return { ok: true };
}

export async function deleteFieldDef(id: string) {
  await requireUser();
  await prisma.customFieldDefinition.delete({ where: { id } });
  revalidatePath("/settings/custom-fields");
}
