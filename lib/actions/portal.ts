"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePortalContractor } from "@/lib/session";
import { nextNumber } from "@/lib/numbering";
import { calculatePayableTotals } from "@/lib/contractors/payable-calc";
import { getRate, toBase } from "@/lib/fx";
import { getCompany } from "@/lib/company";
import { notifyRoles } from "@/lib/notify";
import { audit } from "@/lib/audit";

/**
 * Contractor self-service actions. Auth is requirePortalContractor — the
 * contractor can only ever act on their own records.
 */

const lineSchema = z.object({
  description: z.string().min(1, "Each line needs a description"),
  quantity: z.number().finite().positive(),
  unitPrice: z.number().finite().nonnegative(),
  unit: z.string().nullish(),
});

const submitSchema = z.object({
  engagementId: z.string().nullish(),
  contractorRef: z.string().nullish(),
  periodStart: z.string().nullish(),
  periodEnd: z.string().nullish(),
  notes: z.string().nullish(),
  lines: z.array(lineSchema).min(1, "Add at least one line"),
});

export type PortalInvoiceInput = z.input<typeof submitSchema>;
export type PortalInvoiceResult = { error?: string; internalNumber?: string };

export async function submitPortalInvoice(
  input: PortalInvoiceInput,
): Promise<PortalInvoiceResult> {
  const { user, contractor } = await requirePortalContractor();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invoice" };
  }
  const p = parsed.data;

  // Engagement must belong to this contractor.
  if (p.engagementId) {
    const engagement = await prisma.engagement.findUnique({
      where: { id: p.engagementId },
    });
    if (!engagement || engagement.contractorId !== contractor.id) {
      return { error: "Invalid engagement" };
    }
  }

  const totals = calculatePayableTotals(
    p.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })),
  );
  const company = await getCompany();
  const rate =
    (await getRate(contractor.currency, company.baseCurrency)) ?? 1;

  const payable = await prisma.$transaction(async (tx) => {
    const internalNumber = await nextNumber(tx, "payable", "PAY");
    return tx.contractorInvoice.create({
      data: {
        internalNumber,
        contractorId: contractor.id,
        engagementId: p.engagementId || null,
        contractorRef: p.contractorRef ?? null,
        periodStart: p.periodStart ? new Date(p.periodStart) : null,
        periodEnd: p.periodEnd ? new Date(p.periodEnd) : null,
        currency: contractor.currency,
        fxRate: rate,
        subtotal: totals.subtotal,
        total: totals.total,
        baseTotal: toBase(totals.total, rate),
        notes: p.notes ?? null,
        lines: {
          create: p.lines.map((l, i) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            unit: l.unit ?? null,
            lineTotal: totals.lineTotals[i],
            sortOrder: i,
          })),
        },
      },
    });
  });

  await audit(user, "payable.submit-portal", "ContractorInvoice", payable.id, {
    internalNumber: payable.internalNumber,
    contractor: contractor.name,
  });
  await notifyRoles(["ADMIN", "FINANCE"], {
    type: "payable.received",
    title: `Invoice received from ${contractor.name}`,
    body: `${payable.internalNumber} · ${contractor.currency} ${totals.total.toFixed(2)} — awaiting approval.`,
    href: `/payables/${payable.id}`,
    email: true,
  });

  revalidatePath("/portal");
  revalidatePath("/payables");
  return { internalNumber: payable.internalNumber };
}
