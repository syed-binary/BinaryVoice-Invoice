"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { nextNumber } from "@/lib/numbering";
import { getRate, toBase } from "@/lib/fx";
import { getCompany } from "@/lib/company";
import { toNumber, round2 } from "@/lib/money";
import { audit } from "@/lib/audit";

export type PayoutRunResult = { error?: string; id?: string };

const createRunSchema = z.object({
  name: z.string().nullish(),
  payableIds: z.array(z.string().min(1)).min(1, "Select at least one payable"),
});

export type CreateRunInput = z.input<typeof createRunSchema>;

/** Batch approved payables into a payout run (track-only Wise/bank batch). */
export async function createPayoutRun(
  input: CreateRunInput,
): Promise<PayoutRunResult> {
  const user = await requireCapability("contractors:write");
  const parsed = createRunSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid run" };
  }
  const p = parsed.data;

  const payables = await prisma.contractorInvoice.findMany({
    where: { id: { in: p.payableIds }, status: "APPROVED" },
  });
  if (payables.length !== p.payableIds.length) {
    return { error: "All selected payables must be in APPROVED state" };
  }

  const run = await prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, "payout-run", "POR");
    const created = await tx.payoutRun.create({
      data: {
        number,
        name: p.name ?? null,
        totalBase: round2(
          payables.reduce((s, x) => s + toNumber(x.baseTotal), 0),
        ),
        payouts: {
          create: payables.map((x) => ({
            contractorId: x.contractorId,
            contractorInvoiceId: x.id,
            amount: toNumber(x.total),
            currency: x.currency,
            fxRate: toNumber(x.fxRate),
            baseAmount: toNumber(x.baseTotal),
          })),
        },
      },
    });
    await tx.contractorInvoice.updateMany({
      where: { id: { in: p.payableIds } },
      data: { status: "SCHEDULED" },
    });
    return created;
  });
  await audit(user, "payoutrun.create", "PayoutRun", run.id, {
    number: run.number,
    payables: payables.map((x) => x.internalNumber),
  });

  revalidatePath("/payouts");
  revalidatePath("/payables");
  return { id: run.id };
}

export async function approvePayoutRun(id: string): Promise<PayoutRunResult> {
  const user = await requireCapability("contractors:write");
  const run = await prisma.payoutRun.findUnique({ where: { id } });
  if (!run) return { error: "Run not found" };
  if (run.status !== "DRAFT") return { error: "Only draft runs can be approved" };
  await prisma.payoutRun.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id },
  });
  await audit(user, "payoutrun.approve", "PayoutRun", id, { number: run.number });
  revalidatePath("/payouts");
  return {};
}

const markPaidSchema = z.object({
  id: z.string().min(1),
  paidDate: z.string().min(1),
  method: z.string().nullish(),
  reference: z.string().nullish(),
});

export type MarkRunPaidInput = z.input<typeof markPaidSchema>;

/** Record that the batch was actually sent from the bank/Wise. */
export async function markPayoutRunPaid(
  input: MarkRunPaidInput,
): Promise<PayoutRunResult> {
  const user = await requireCapability("contractors:write");
  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const p = parsed.data;

  const run = await prisma.payoutRun.findUnique({
    where: { id: p.id },
    include: { payouts: true },
  });
  if (!run) return { error: "Run not found" };
  if (run.status !== "APPROVED") {
    return { error: "Approve the run before marking it paid" };
  }

  const company = await getCompany();
  const paidDate = new Date(p.paidDate);

  // Re-snapshot FX at the actual payment date (realized rate).
  for (const payout of run.payouts) {
    const rate =
      (await getRate(payout.currency, company.baseCurrency, paidDate)) ??
      toNumber(payout.fxRate);
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        paidDate,
        reference: p.reference ?? null,
        fxRate: rate,
        baseAmount: toBase(toNumber(payout.amount), rate),
      },
    });
  }
  await prisma.$transaction([
    prisma.payoutRun.update({
      where: { id: p.id },
      data: {
        status: "PAID",
        paidDate,
        method: p.method ?? null,
        reference: p.reference ?? null,
      },
    }),
    prisma.contractorInvoice.updateMany({
      where: { id: { in: run.payouts.map((x) => x.contractorInvoiceId!).filter(Boolean) } },
      data: { status: "PAID" },
    }),
  ]);
  await audit(user, "payoutrun.paid", "PayoutRun", p.id, {
    number: run.number,
    paidDate: p.paidDate,
    payoutCount: run.payouts.length,
  });

  revalidatePath("/payouts");
  revalidatePath("/payables");
  return {};
}

export async function deletePayoutRun(id: string): Promise<PayoutRunResult> {
  const user = await requireCapability("contractors:write");
  const run = await prisma.payoutRun.findUnique({
    where: { id },
    include: { payouts: true },
  });
  if (!run) return { error: "Run not found" };
  if (run.status === "PAID") return { error: "Paid runs are immutable" };

  await prisma.$transaction([
    prisma.payout.deleteMany({ where: { payoutRunId: id } }),
    prisma.contractorInvoice.updateMany({
      where: {
        id: { in: run.payouts.map((x) => x.contractorInvoiceId!).filter(Boolean) },
        status: "SCHEDULED",
      },
      data: { status: "APPROVED" },
    }),
    prisma.payoutRun.delete({ where: { id } }),
  ]);
  await audit(user, "payoutrun.delete", "PayoutRun", id, { number: run.number });
  revalidatePath("/payouts");
  revalidatePath("/payables");
  return {};
}
