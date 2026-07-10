import { round2 } from "./money";

/**
 * Pure FX math — no DB, no network (the ECB fetcher is injected). The
 * service wrapper with caching lives in lib/fx.ts.
 *
 * ECB does not quote AED (or other pegged Gulf currencies), so legs involving
 * them are routed via USD using the central-bank peg.
 */

/** USD pegs for currencies ECB doesn't quote. Source: central bank fixed pegs. */
export const USD_PEGS: Record<string, number> = {
  AED: 3.6725,
  SAR: 3.75,
  QAR: 3.64,
  OMR: 0.3845,
  BHD: 0.376,
};

/** Convert a document-currency amount to base currency at a stored rate. */
export function toBase(amount: number, rate: number): number {
  return round2(amount * rate);
}

export type EcbFetch = (from: string, to: string) => Promise<number | null>;

/** Resolve from→to, routing pegged currencies via USD. */
export async function resolveRate(
  from: string,
  to: string,
  ecb: EcbFetch,
): Promise<number | null> {
  if (from === to) return 1;
  const fromPeg = USD_PEGS[from];
  const toPeg = USD_PEGS[to];
  if (fromPeg && toPeg) return toPeg / fromPeg;
  if (toPeg) {
    if (from === "USD") return toPeg;
    const fromToUsd = await ecb(from, "USD");
    return fromToUsd === null ? null : fromToUsd * toPeg;
  }
  if (fromPeg) {
    if (to === "USD") return 1 / fromPeg;
    const usdToTarget = await ecb("USD", to);
    return usdToTarget === null ? null : usdToTarget / fromPeg;
  }
  return ecb(from, to);
}
