"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DealStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { audit } from "@/lib/audit";

const dealSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Deal name is required"),
  clientId: z.string().nullish(),
  prospectName: z.string().nullish(),
  prospectEmail: z.string().email().nullish().or(z.literal("")),
  contactId: z.string().nullish(),
  value: z.number().nonnegative().nullish(),
  currency: z.string().min(1).default("AED"),
  probability: z.number().int().min(0).max(100).nullish(),
  expectedCloseDate: z.string().nullish(),
  stage: z
    .enum(["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"])
    .default("LEAD"),
});

export type DealInput = z.input<typeof dealSchema>;
export type DealResult = { error?: string; id?: string };

export async function saveDeal(input: DealInput): Promise<DealResult> {
  const user = await requireCapability("clients:write");
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid deal" };
  }
  const p = parsed.data;
  if (!p.clientId && !p.prospectName) {
    return { error: "Pick a client or enter a prospect name" };
  }

  const data = {
    name: p.name,
    clientId: p.clientId || null,
    prospectName: p.clientId ? null : (p.prospectName ?? null),
    prospectEmail: p.clientId ? null : p.prospectEmail || null,
    contactId: p.contactId || null,
    value: p.value ?? null,
    currency: p.currency,
    probability: p.probability ?? null,
    expectedCloseDate: p.expectedCloseDate ? new Date(p.expectedCloseDate) : null,
    stage: p.stage,
  };

  const saved = p.id
    ? await prisma.deal.update({ where: { id: p.id }, data })
    : await prisma.deal.create({ data: { ...data, ownerId: user.id } });

  revalidatePath("/crm");
  revalidatePath(`/crm/deals/${saved.id}`);
  return { id: saved.id };
}

export async function moveDealStage(
  id: string,
  stage: DealStage,
  lostReason?: string,
): Promise<DealResult> {
  const user = await requireCapability("clients:write");
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) return { error: "Deal not found" };

  await prisma.deal.update({
    where: { id },
    data: {
      stage,
      lostReason: stage === "LOST" ? (lostReason ?? null) : null,
    },
  });
  if (stage === "WON" || stage === "LOST") {
    await audit(user, `deal.${stage.toLowerCase()}`, "Deal", id, {
      name: deal.name,
      ...(lostReason ? { lostReason } : {}),
    });
  }
  revalidatePath("/crm");
  revalidatePath(`/crm/deals/${id}`);
  return { id };
}

/** Promote a prospect deal into a real Client and link it. */
export async function convertProspectToClient(id: string): Promise<DealResult> {
  await requireCapability("clients:write");
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) return { error: "Deal not found" };
  if (deal.clientId) return { error: "Deal already has a client" };
  if (!deal.prospectName) return { error: "No prospect details to convert" };

  const client = await prisma.client.create({
    data: {
      displayName: deal.prospectName,
      email: deal.prospectEmail,
      currency: deal.currency,
    },
  });
  await prisma.deal.update({
    where: { id },
    data: { clientId: client.id, prospectName: null, prospectEmail: null },
  });

  revalidatePath("/crm");
  revalidatePath(`/crm/deals/${id}`);
  revalidatePath("/clients");
  return { id };
}

export async function deleteDeal(id: string) {
  await requireCapability("clients:write");
  await prisma.deal.delete({ where: { id } });
  revalidatePath("/crm");
  redirect("/crm");
}

