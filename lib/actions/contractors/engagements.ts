"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";

const engagementSchema = z.object({
  id: z.string().optional(),
  contractorId: z.string().min(1),
  clientId: z.string().nullish(), // null = internal/lab work
  title: z.string().min(1, "Title is required"),
  startDate: z.string().min(1),
  endDate: z.string().nullish(),
  rateUnit: z.enum(["HOUR", "DAY", "MONTH", "FIXED"]),
  costRate: z.number().nonnegative(),
  costCurrency: z.string().min(1),
  billRate: z.number().nonnegative().nullish(),
  billCurrency: z.string().nullish(),
  capacity: z.number().positive().max(1).nullish(),
  ir35Status: z
    .enum(["NOT_APPLICABLE", "INSIDE", "OUTSIDE", "UNDETERMINED"])
    .default("NOT_APPLICABLE"),
  ir35Notes: z.string().nullish(),
  notes: z.string().nullish(),
});

export type EngagementInput = z.input<typeof engagementSchema>;
export type EngagementResult = { error?: string; id?: string };

export async function saveEngagement(
  input: EngagementInput,
): Promise<EngagementResult> {
  await requireCapability("contractors:write");
  const parsed = engagementSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid engagement" };
  }
  const p = parsed.data;

  const data = {
    contractorId: p.contractorId,
    clientId: p.clientId || null,
    title: p.title,
    startDate: new Date(p.startDate),
    endDate: p.endDate ? new Date(p.endDate) : null,
    rateUnit: p.rateUnit,
    costRate: p.costRate,
    costCurrency: p.costCurrency,
    billRate: p.billRate ?? null,
    billCurrency: p.billRate != null ? (p.billCurrency ?? null) : null,
    capacity: p.capacity ?? null,
    ir35Status: p.ir35Status,
    ir35Notes: p.ir35Notes ?? null,
    notes: p.notes ?? null,
  };

  const saved = p.id
    ? await prisma.engagement.update({ where: { id: p.id }, data })
    : await prisma.engagement.create({ data });

  revalidatePath(`/contractors/${p.contractorId}`);
  return { id: saved.id };
}

export async function setEngagementStatus(id: string, status: "ACTIVE" | "ENDED") {
  await requireCapability("contractors:write");
  const e = await prisma.engagement.update({
    where: { id },
    data: {
      status,
      ...(status === "ENDED" ? { endDate: new Date() } : {}),
    },
  });
  revalidatePath(`/contractors/${e.contractorId}`);
}

export async function deleteEngagement(id: string): Promise<EngagementResult> {
  await requireCapability("contractors:write");
  const counts = await prisma.engagement.findUnique({
    where: { id },
    include: { _count: { select: { payables: true, lineItems: true } } },
  });
  if (!counts) return { error: "Engagement not found" };
  if (counts._count.payables > 0 || counts._count.lineItems > 0) {
    return { error: "Engagement has linked payables or invoice lines — end it instead." };
  }
  await prisma.engagement.delete({ where: { id } });
  revalidatePath(`/contractors/${counts.contractorId}`);
  return {};
}
