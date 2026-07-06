import { Prisma } from "@prisma/client";

export type Decimalish = number | string | Prisma.Decimal | null | undefined;

/** Convert any Prisma Decimal / string / number into a plain JS number. */
export function toNumber(value: Decimalish): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

/** Round to 2 decimal places, avoiding floating point drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** The new UAE Dirham symbol, at Private-Use codepoint U+E800 (rendered by the
 *  bundled DirhamSymbol web font). A thin space separates it from the number. */
export const DIRHAM_SYMBOL = "";

/** Format an amount as currency (default AED, en-AE).
 *  AED renders with the Dirham symbol; other currencies use their ISO code. */
export function formatMoney(value: Decimalish, currency = "AED"): string {
  if (currency === "AED") {
    return `${DIRHAM_SYMBOL} ${formatNumber(value)}`;
  }
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

/** Plain number formatting with grouping (no currency symbol). */
export function formatNumber(value: Decimalish, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(toNumber(value));
}
