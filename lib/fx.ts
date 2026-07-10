import { prisma } from "./prisma";
import { resolveRate, toBase } from "./fx-core";

export { toBase };

/**
 * FX layer. Amounts are stored in document currency; every money document
 * snapshots `fxRate` (document currency → base currency) so reporting can sum
 * `baseTotal`/`baseAmount` in the base currency (AED).
 *
 * Rate resolution: same-day FxRate cache → ECB reference rates via
 * frankfurter.app (pegged Gulf currencies routed via USD — see lib/fx-core.ts)
 * → null (caller falls back to manual entry / a stored rate).
 */

async function cachedRate(base: string, quote: string, date: Date): Promise<number | null> {
  const day = new Date(date.toISOString().slice(0, 10));
  const row = await prisma.fxRate.findUnique({
    where: { base_quote_date: { base, quote, date: day } },
  });
  return row ? Number(row.rate) : null;
}

async function cacheRate(
  base: string,
  quote: string,
  date: Date,
  rate: number,
  source: string,
) {
  const day = new Date(date.toISOString().slice(0, 10));
  await prisma.fxRate.upsert({
    where: { base_quote_date: { base, quote, date: day } },
    create: { base, quote, date: day, rate, source },
    // Never overwrite a manual entry with a fetched one.
    update: source === "MANUAL" ? { rate, source } : {},
  });
}

/** ECB cross rate via frankfurter.app; date-aware (historical supported). */
async function fetchEcbRate(from: string, to: string, date: Date): Promise<number | null> {
  const day = date.toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/${day}?base=${from}&symbols=${to}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    return data.rates?.[to] ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the from→to rate for a date: cache first, then ECB/peg resolution
 * (cached on success). Returns null when unresolvable — callers must fall
 * back to a stored rate or ask for manual entry.
 */
export async function getRate(
  from: string,
  to: string,
  date: Date = new Date(),
): Promise<number | null> {
  if (from === to) return 1;
  const cached = await cachedRate(from, to, date);
  if (cached !== null) return cached;
  const rate = await resolveRate(from, to, (f, t) => fetchEcbRate(f, t, date));
  if (rate !== null) await cacheRate(from, to, date, rate, "ECB");
  return rate;
}

/** Store a manual rate (authoritative — overwrites any fetched rate). */
export async function setManualRate(
  from: string,
  to: string,
  date: Date,
  rate: number,
) {
  await cacheRate(from, to, date, rate, "MANUAL");
}
