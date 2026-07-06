"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { EstimateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { calculateTotals } from "@/lib/calculations";
import { nextEstimateNumber, nextInvoiceNumber } from "@/lib/invoice-number";

const lineSchema = z.object({
  itemId: z.string().nullish(),
  description: z.string().min(1, "Each line needs a description"),
  quantity: z.number().finite(),
  unitPrice: z.number().finite(),
  unit: z.string().nullish(),
  discount: z.number().finite().default(0),
});

const payloadSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1, "Select a client"),
  issueDate: z.string().min(1),
  expiryDate: z.string().nullish(),
  currency: z.string().min(1),
  vatEnabled: z.boolean(),
  vatRate: z.number().finite().default(5),
  withholdingEnabled: z.boolean().default(false),
  withholdingRate: z.number().finite().default(0),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().finite().default(0),
  notes: z.string().nullish(),
  terms: z.string().nullish(),
  templateId: z.string().default("modern"),
  accentColor: z.string().nullish(),
  markSent: z.boolean().optional(),
  customFields: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  lineItems: z.array(lineSchema).min(1, "Add at least one line item"),
});

export type EstimatePayload = z.input<typeof payloadSchema>;
export type SaveResult = { error?: string; id?: string };

export async function saveEstimate(payload: EstimatePayload): Promise<SaveResult> {
  await requireUser();
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid estimate" };
  }
  const p = parsed.data;

  const totals = calculateTotals({
    lines: p.lineItems.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
    })),
    discountType: p.discountType,
    discountValue: p.discountValue,
    vatEnabled: p.vatEnabled,
    vatRate: p.vatRate,
    withholdingEnabled: p.withholdingEnabled,
    withholdingRate: p.withholdingRate,
  });

  const lineData = p.lineItems.map((l, i) => ({
    itemId: l.itemId ?? null,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    unit: l.unit ?? null,
    discount: l.discount,
    lineTotal: totals.lineTotals[i],
    sortOrder: i,
  }));

  const common = {
    clientId: p.clientId,
    issueDate: new Date(p.issueDate),
    expiryDate: p.expiryDate ? new Date(p.expiryDate) : null,
    currency: p.currency,
    vatEnabled: p.vatEnabled,
    vatRate: p.vatRate,
    withholdingEnabled: p.withholdingEnabled,
    withholdingRate: p.withholdingRate,
    withholdingAmount: totals.withholdingAmount,
    discountType: p.discountType,
    discountValue: p.discountValue,
    discountAmount: totals.discountAmount,
    subtotal: totals.subtotal,
    vatAmount: totals.vatAmount,
    total: totals.total,
    netPayable: totals.netPayable,
    notes: p.notes ?? null,
    terms: p.terms ?? null,
    templateId: p.templateId,
    accentColor: p.accentColor ?? null,
    customFields: p.customFields,
  };

  let estimateId: string;
  if (p.id) {
    const existing = await prisma.estimate.findUnique({
      where: { id: p.id },
      select: { status: true },
    });
    if (!existing) return { error: "Estimate not found" };
    let status: EstimateStatus = existing.status;
    if (p.markSent && existing.status === "DRAFT") status = "SENT";

    await prisma.$transaction([
      prisma.estimateLineItem.deleteMany({ where: { estimateId: p.id } }),
      prisma.estimate.update({
        where: { id: p.id },
        data: { ...common, status, lineItems: { create: lineData } },
      }),
    ]);
    estimateId = p.id;
  } else {
    const created = await prisma.$transaction(async (tx) => {
      const number = await nextEstimateNumber(tx);
      return tx.estimate.create({
        data: {
          ...common,
          number,
          status: p.markSent ? "SENT" : "DRAFT",
          lineItems: { create: lineData },
        },
      });
    });
    estimateId = created.id;
  }

  revalidatePath("/estimates");
  return { id: estimateId };
}

export async function setEstimateStatus(id: string, status: EstimateStatus) {
  await requireUser();
  await prisma.estimate.update({ where: { id }, data: { status } });
  revalidatePath("/estimates");
  revalidatePath(`/estimates/${id}`);
}

export async function deleteEstimate(id: string) {
  await requireUser();
  await prisma.estimate.delete({ where: { id } });
  revalidatePath("/estimates");
  redirect("/estimates");
}

export async function convertToInvoice(id: string): Promise<SaveResult> {
  await requireUser();
  const est = await prisma.estimate.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } }, invoice: true },
  });
  if (!est) return { error: "Estimate not found" };
  if (est.invoice) redirect(`/invoices/${est.invoice.id}`);

  const company = await prisma.companySettings.findUnique({ where: { id: "company" } });
  const dueDays = company?.defaultDueDays ?? 14;

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextInvoiceNumber(tx);
    const due = new Date();
    due.setDate(due.getDate() + dueDays);
    const invoice = await tx.invoice.create({
      data: {
        number,
        status: "DRAFT",
        clientId: est.clientId,
        issueDate: new Date(),
        dueDate: due,
        currency: est.currency,
        vatEnabled: est.vatEnabled,
        vatRate: est.vatRate,
        withholdingEnabled: est.withholdingEnabled,
        withholdingRate: est.withholdingRate,
        withholdingAmount: est.withholdingAmount,
        discountType: est.discountType,
        discountValue: est.discountValue,
        discountAmount: est.discountAmount,
        subtotal: est.subtotal,
        vatAmount: est.vatAmount,
        total: est.total,
        netPayable: est.netPayable,
        notes: est.notes,
        terms: est.terms,
        templateId: est.templateId,
        accentColor: est.accentColor,
        customFields: est.customFields ?? undefined,
        estimateId: est.id,
        lineItems: {
          create: est.lineItems.map((l) => ({
            itemId: l.itemId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            unit: l.unit,
            discount: l.discount,
            lineTotal: l.lineTotal,
            sortOrder: l.sortOrder,
          })),
        },
      },
    });
    await tx.estimate.update({ where: { id: est.id }, data: { status: "CONVERTED" } });
    return invoice;
  });

  revalidatePath("/estimates");
  revalidatePath("/invoices");
  redirect(`/invoices/${created.id}`);
}
