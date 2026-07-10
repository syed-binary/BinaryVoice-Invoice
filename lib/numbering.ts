import type { Prisma } from "@prisma/client";

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * Atomically reserve the next number for a named sequence (contracts,
 * payables, payout/payroll runs, …). Must be called inside a Prisma
 * transaction (`tx`) — same contract as lib/invoice-number.ts, which keeps
 * the invoice/estimate counters on CompanySettings.
 *
 * The sequence row is created on first use with the given prefix; the stored
 * prefix wins on subsequent calls so it can be re-configured in the DB.
 * Format: {PREFIX}-{YEAR}-{PADDED} e.g. CTR-2026-0001
 */
export async function nextNumber(
  tx: Prisma.TransactionClient,
  key: string,
  defaultPrefix: string,
): Promise<string> {
  const seq = await tx.numberSequence.upsert({
    where: { key },
    create: { key, prefix: defaultPrefix, next: 2 },
    update: { next: { increment: 1 } },
  });
  const n = seq.next - 1;
  const year = new Date().getFullYear();
  return `${seq.prefix}-${year}-${pad(n, seq.padding)}`;
}
