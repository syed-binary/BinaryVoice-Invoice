import { round2 } from "../money";

/**
 * Deterministic sanity checks for contractor payables — surfaced as
 * warnings on the payable page before approval. Pure.
 */

export interface AnomalyInput {
  total: number;
  currency: string;
  contractorRef: string | null;
  duplicateRefCount: number; // other payables from this contractor with the same ref
  engagement: {
    rateUnit: string;
    costRate: number;
    costCurrency: string;
  } | null;
  periodDays: number | null; // periodEnd − periodStart, inclusive
}

export function payableAnomalies(input: AnomalyInput): string[] {
  const warnings: string[] = [];
  if (input.contractorRef && input.duplicateRefCount > 0) {
    warnings.push(
      `Possible duplicate: ${input.duplicateRefCount} other payable(s) from this contractor carry reference "${input.contractorRef}".`,
    );
  }
  if (input.engagement) {
    const e = input.engagement;
    if (input.currency !== e.costCurrency) {
      warnings.push(
        `Currency mismatch: invoice is in ${input.currency} but the engagement is agreed in ${e.costCurrency}.`,
      );
    } else {
      let expected: number | null = null;
      if (e.rateUnit === "MONTH") expected = e.costRate;
      else if (e.rateUnit === "DAY" && input.periodDays) expected = e.costRate * input.periodDays;
      if (expected !== null && expected > 0) {
        const drift = Math.abs(input.total - expected) / expected;
        if (drift > 0.1) {
          warnings.push(
            `Amount differs from the engagement rate: expected ≈ ${round2(expected)} ${e.costCurrency} for the period, invoiced ${round2(input.total)}.`,
          );
        }
      }
    }
  }
  return warnings;
}
