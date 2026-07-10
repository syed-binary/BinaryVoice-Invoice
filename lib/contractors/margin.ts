import { round2 } from "../money";

/**
 * Margin math for engagements, in base currency. Callers convert cost/bill
 * amounts to base first (lib/fx.ts) — this module is pure.
 */

export interface Margin {
  amount: number;
  pct: number | null; // null when bill is 0 (no denominator)
}

/** Margin between a base-currency bill amount and cost amount. */
export function margin(costBase: number, billBase: number): Margin {
  const amount = round2(billBase - costBase);
  const pct = billBase > 0 ? round2((amount / billBase) * 100) : null;
  return { amount, pct };
}
