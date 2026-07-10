"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Invoice, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/money";
import { audit } from "@/lib/audit";
import { getCompany } from "@/lib/company";
import { getRate, toBase } from "@/lib/fx";

function deriveStatus(invoice: Invoice, amountPaid: number): InvoiceStatus {
  if (invoice.status === "CANCELLED") return "CANCELLED";
  // The client settles the net payable (total less any withholding they deduct).
  const net = toNumber(invoice.netPayable);
  const target = net > 0 ? net : toNumber(invoice.total);
  if (target > 0 && amountPaid >= target - 0.005) return "PAID";
  if (amountPaid > 0.005) return "PARTIALLY_PAID";
  if (invoice.status === "DRAFT") return "DRAFT";
  if (invoice.dueDate && invoice.dueDate < new Date()) return "OVERDUE";
  return "SENT";
}

async function recompute(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;
  const agg = await prisma.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  const amountPaid = toNumber(agg._sum.amount);
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid, status: deriveStatus(invoice, amountPaid) },
  });
}

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive("Amount must be greater than zero"),
  date: z.string().min(1),
  method: z.string().nullish(),
  reference: z.string().nullish(),
  notes: z.string().nullish(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
export type PaymentResult = { error?: string; ok?: boolean };

export async function addPayment(input: PaymentInput): Promise<PaymentResult> {
  const user = await requireUser();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment" };
  }
  const p = parsed.data;

  // FX at payment date; fall back to the invoice's issue-time rate.
  const invoice = await prisma.invoice.findUnique({
    where: { id: p.invoiceId },
    select: { currency: true, fxRate: true },
  });
  if (!invoice) return { error: "Invoice not found" };
  const company = await getCompany();
  const rate =
    (await getRate(invoice.currency, company.baseCurrency, new Date(p.date))) ??
    toNumber(invoice.fxRate);

  const payment = await prisma.payment.create({
    data: {
      invoiceId: p.invoiceId,
      amount: p.amount,
      date: new Date(p.date),
      method: p.method ?? null,
      reference: p.reference ?? null,
      notes: p.notes ?? null,
      fxRate: rate,
      baseAmount: toBase(p.amount, rate),
    },
  });
  await audit(user, "payment.add", "Invoice", p.invoiceId, {
    paymentId: payment.id,
    amount: p.amount,
  });
  await recompute(p.invoiceId);
  revalidatePath(`/invoices/${p.invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deletePayment(paymentId: string) {
  const user = await requireUser();
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;
  await prisma.payment.delete({ where: { id: paymentId } });
  await audit(user, "payment.delete", "Invoice", payment.invoiceId, {
    paymentId,
    amount: toNumber(payment.amount),
  });
  await recompute(payment.invoiceId);
  revalidatePath(`/invoices/${payment.invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}
