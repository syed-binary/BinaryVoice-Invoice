"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { calculateTotals } from "@/lib/calculations";
import { nextInvoiceNumber } from "@/lib/invoice-number";

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
  dueDate: z.string().nullish(),
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

export type InvoicePayload = z.input<typeof payloadSchema>;
export type SaveResult = { error?: string; id?: string };

export async function saveInvoice(payload: InvoicePayload): Promise<SaveResult> {
  await requireUser();

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invoice" };
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
    dueDate: p.dueDate ? new Date(p.dueDate) : null,
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

  let invoiceId: string;

  if (p.id) {
    const existing = await prisma.invoice.findUnique({
      where: { id: p.id },
      select: { status: true },
    });
    if (!existing) return { error: "Invoice not found" };

    let status: InvoiceStatus = existing.status;
    if (p.markSent && existing.status === "DRAFT") status = "SENT";

    await prisma.$transaction([
      prisma.lineItem.deleteMany({ where: { invoiceId: p.id } }),
      prisma.invoice.update({
        where: { id: p.id },
        data: { ...common, status, lineItems: { create: lineData } },
      }),
    ]);
    invoiceId = p.id;
  } else {
    const created = await prisma.$transaction(async (tx) => {
      const number = await nextInvoiceNumber(tx);
      return tx.invoice.create({
        data: {
          ...common,
          number,
          status: p.markSent ? "SENT" : "DRAFT",
          lineItems: { create: lineData },
        },
      });
    });
    invoiceId = created.id;
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { id: invoiceId };
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  await requireUser();
  await prisma.invoice.update({ where: { id }, data: { status } });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteInvoice(id: string) {
  await requireUser();
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}

export async function duplicateInvoice(id: string): Promise<SaveResult> {
  await requireUser();
  const src = await prisma.invoice.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!src) return { error: "Invoice not found" };

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextInvoiceNumber(tx);
    return tx.invoice.create({
      data: {
        number,
        status: "DRAFT",
        clientId: src.clientId,
        issueDate: new Date(),
        dueDate: null,
        currency: src.currency,
        vatEnabled: src.vatEnabled,
        vatRate: src.vatRate,
        withholdingEnabled: src.withholdingEnabled,
        withholdingRate: src.withholdingRate,
        withholdingAmount: src.withholdingAmount,
        discountType: src.discountType,
        discountValue: src.discountValue,
        discountAmount: src.discountAmount,
        subtotal: src.subtotal,
        vatAmount: src.vatAmount,
        total: src.total,
        netPayable: src.netPayable,
        notes: src.notes,
        terms: src.terms,
        templateId: src.templateId,
        accentColor: src.accentColor,
        customFields: src.customFields ?? undefined,
        lineItems: {
          create: src.lineItems.map((l) => ({
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
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${created.id}`);
}
