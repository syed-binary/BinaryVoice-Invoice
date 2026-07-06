import type { Prisma } from "@prisma/client";

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * Atomically reserve the next invoice number and increment the counter.
 * Must be called inside a Prisma transaction (`tx`).
 * Format: {PREFIX}-{YEAR}-{PADDED} e.g. BL-2026-0001
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const settings = await tx.companySettings.update({
    where: { id: "company" },
    data: { nextInvoiceNumber: { increment: 1 } },
  });
  const seq = settings.nextInvoiceNumber - 1;
  const year = new Date().getFullYear();
  return `${settings.invoicePrefix}-${year}-${pad(seq, settings.numberPadding)}`;
}

/**
 * Atomically reserve the next estimate number and increment the counter.
 * Format: {PREFIX}-{YEAR}-{PADDED} e.g. EST-2026-0001
 */
export async function nextEstimateNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const settings = await tx.companySettings.update({
    where: { id: "company" },
    data: { nextEstimateNumber: { increment: 1 } },
  });
  const seq = settings.nextEstimateNumber - 1;
  const year = new Date().getFullYear();
  return `${settings.estimatePrefix}-${year}-${pad(seq, settings.numberPadding)}`;
}
