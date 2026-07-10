"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { nextNumber } from "@/lib/numbering";
import { calculatePayableTotals } from "@/lib/contractors/payable-calc";
import { getRate, toBase } from "@/lib/fx";
import { getCompany } from "@/lib/company";
import { toNumber } from "@/lib/money";
import { audit } from "@/lib/audit";

const lineSchema = z.object({
  description: z.string().min(1, "Each line needs a description"),
  quantity: z.number().finite(),
  unitPrice: z.number().finite(),
  unit: z.string().nullish(),
});

const payableSchema = z.object({
  id: z.string().optional(),
  contractorId: z.string().min(1, "Select a contractor"),
  engagementId: z.string().nullish(),
  contractorRef: z.string().nullish(),
  periodStart: z.string().nullish(),
  periodEnd: z.string().nullish(),
  issueDate: z.string().min(1),
  dueDate: z.string().nullish(),
  currency: z.string().min(1),
  fxRate: z.number().positive().default(1),
  sourceDocumentId: z.string().nullish(),
  notes: z.string().nullish(),
  lines: z.array(lineSchema).min(1, "Add at least one line"),
});

export type PayableInput = z.input<typeof payableSchema>;
export type PayableResult = { error?: string; id?: string };

export async function savePayable(input: PayableInput): Promise<PayableResult> {
  await requireCapability("contractors:write");
  const parsed = payableSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payable" };
  }
  const p = parsed.data;

  const totals = calculatePayableTotals(
    p.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })),
  );
  const lineData = p.lines.map((l, i) => ({
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    unit: l.unit ?? null,
    lineTotal: totals.lineTotals[i],
    sortOrder: i,
  }));

  const common = {
    contractorId: p.contractorId,
    engagementId: p.engagementId || null,
    contractorRef: p.contractorRef ?? null,
    periodStart: p.periodStart ? new Date(p.periodStart) : null,
    periodEnd: p.periodEnd ? new Date(p.periodEnd) : null,
    issueDate: new Date(p.issueDate),
    dueDate: p.dueDate ? new Date(p.dueDate) : null,
    currency: p.currency,
    fxRate: p.fxRate,
    subtotal: totals.subtotal,
    total: totals.total,
    baseTotal: toBase(totals.total, p.fxRate),
    sourceDocumentId: p.sourceDocumentId || null,
    notes: p.notes ?? null,
  };

  let id: string;
  if (p.id) {
    const existing = await prisma.contractorInvoice.findUnique({
      where: { id: p.id },
      select: { status: true },
    });
    if (!existing) return { error: "Payable not found" };
    if (existing.status !== "RECEIVED") {
      return { error: "Only payables awaiting approval can be edited" };
    }
    await prisma.$transaction([
      prisma.contractorInvoiceLine.deleteMany({ where: { payableId: p.id } }),
      prisma.contractorInvoice.update({
        where: { id: p.id },
        data: { ...common, lines: { create: lineData } },
      }),
    ]);
    id = p.id;
  } else {
    const created = await prisma.$transaction(async (tx) => {
      const internalNumber = await nextNumber(tx, "payable", "PAY");
      return tx.contractorInvoice.create({
        data: { ...common, internalNumber, lines: { create: lineData } },
      });
    });
    id = created.id;
  }

  revalidatePath("/payables");
  revalidatePath(`/payables/${id}`);
  return { id };
}

export async function approvePayable(id: string): Promise<PayableResult> {
  const user = await requireCapability("contractors:write");
  const payable = await prisma.contractorInvoice.findUnique({ where: { id } });
  if (!payable) return { error: "Payable not found" };
  if (payable.status !== "RECEIVED") {
    return { error: "Only received payables can be approved" };
  }
  await prisma.contractorInvoice.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() },
  });
  await audit(user, "payable.approve", "ContractorInvoice", id, {
    internalNumber: payable.internalNumber,
    baseTotal: toNumber(payable.baseTotal),
  });
  revalidatePath("/payables");
  revalidatePath(`/payables/${id}`);
  return {};
}

export async function rejectPayable(
  id: string,
  reason: string,
): Promise<PayableResult> {
  const user = await requireCapability("contractors:write");
  const payable = await prisma.contractorInvoice.findUnique({ where: { id } });
  if (!payable) return { error: "Payable not found" };
  if (payable.status !== "RECEIVED") {
    return { error: "Only received payables can be rejected" };
  }
  await prisma.contractorInvoice.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason || null },
  });
  await audit(user, "payable.reject", "ContractorInvoice", id, {
    internalNumber: payable.internalNumber,
    reason,
  });
  revalidatePath("/payables");
  revalidatePath(`/payables/${id}`);
  return {};
}

export async function deletePayable(id: string) {
  const user = await requireCapability("contractors:write");
  const payable = await prisma.contractorInvoice.findUnique({ where: { id } });
  if (!payable) return;
  if (payable.status === "PAID") return; // paid history is immutable
  await prisma.contractorInvoice.delete({ where: { id } });
  await audit(user, "payable.delete", "ContractorInvoice", id, {
    internalNumber: payable.internalNumber,
  });
  revalidatePath("/payables");
  redirect("/payables");
}

const recordPayoutSchema = z.object({
  payableId: z.string().min(1),
  paidDate: z.string().min(1),
  reference: z.string().nullish(),
  feeAmount: z.number().nonnegative().nullish(),
});

export type RecordPayoutInput = z.input<typeof recordPayoutSchema>;

/** Track-only: record that a single payable was paid out via bank/Wise. */
export async function recordPayout(
  input: RecordPayoutInput,
): Promise<PayableResult> {
  const user = await requireCapability("contractors:write");
  const parsed = recordPayoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payout" };
  }
  const p = parsed.data;

  const payable = await prisma.contractorInvoice.findUnique({
    where: { id: p.payableId },
  });
  if (!payable) return { error: "Payable not found" };
  if (payable.status !== "APPROVED" && payable.status !== "SCHEDULED") {
    return { error: "Approve the payable before recording a payout" };
  }

  const company = await getCompany();
  const paidDate = new Date(p.paidDate);
  const rate =
    (await getRate(payable.currency, company.baseCurrency, paidDate)) ??
    toNumber(payable.fxRate);
  const amount = toNumber(payable.total);

  await prisma.$transaction([
    prisma.payout.create({
      data: {
        contractorId: payable.contractorId,
        contractorInvoiceId: payable.id,
        amount,
        currency: payable.currency,
        fxRate: rate,
        baseAmount: toBase(amount, rate),
        feeAmount: p.feeAmount ?? null,
        paidDate,
        reference: p.reference ?? null,
      },
    }),
    prisma.contractorInvoice.update({
      where: { id: payable.id },
      data: { status: "PAID" },
    }),
  ]);
  await audit(user, "payout.record", "ContractorInvoice", payable.id, {
    internalNumber: payable.internalNumber,
    amount,
    currency: payable.currency,
  });

  revalidatePath("/payables");
  revalidatePath(`/payables/${payable.id}`);
  revalidatePath("/payouts");
  return {};
}
