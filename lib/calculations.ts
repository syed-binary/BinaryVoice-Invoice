import { round2 } from "./money";

export type CalcDiscountType = "PERCENT" | "FIXED";

export interface CalcLine {
  quantity: number;
  unitPrice: number;
  discount: number; // fixed amount off this line
}

export interface CalcInput {
  lines: CalcLine[];
  discountType: CalcDiscountType;
  discountValue: number;
  vatEnabled: boolean;
  vatRate: number; // document-level VAT %, e.g. 5 (or 0 for zero-rated exports)
  withholdingEnabled: boolean;
  withholdingRate: number; // e.g. 20 — deducted by the client at source
}

export interface CalcResult {
  lineTotals: number[]; // net per line (quantity * rate - line discount)
  subtotal: number;
  discountAmount: number;
  taxableBase: number; // subtotal - discount (the service value ex-VAT)
  vatAmount: number;
  total: number; // taxableBase + VAT (the invoiced amount)
  withholdingAmount: number; // deducted by the client
  netPayable: number; // total - withholding (what the client actually transfers)
}

/**
 * Compute invoice/estimate totals.
 *
 * - Line net = quantity * rate - line discount.
 * - Subtotal = sum of line nets.
 * - Invoice discount (percent or fixed) reduces the subtotal → taxable base.
 * - VAT (added) is charged on the taxable base at the document VAT rate.
 *   For services exported to a non-UAE client this is 0% (zero-rated).
 * - Withholding tax is DISCLOSED (computed on the taxable base) but borne and
 *   remitted separately by the client to the tax authority, over and above the
 *   invoice value — so the full invoice total remains payable to us.
 *   Note: UAE withholding is 0%; a non-zero rate here reflects the foreign
 *   client's domestic withholding (e.g. Egypt) net of any treaty relief.
 */
export function calculateTotals(input: CalcInput): CalcResult {
  const lineTotals = input.lines.map((l) =>
    round2(l.quantity * l.unitPrice - l.discount),
  );

  const subtotal = round2(lineTotals.reduce((s, t) => s + t, 0));

  let discountAmount = 0;
  if (input.discountType === "PERCENT") {
    discountAmount = round2((subtotal * input.discountValue) / 100);
  } else {
    discountAmount = round2(input.discountValue);
  }
  if (discountAmount > subtotal) discountAmount = subtotal;
  if (discountAmount < 0) discountAmount = 0;

  const taxableBase = round2(subtotal - discountAmount);

  const vatAmount = input.vatEnabled
    ? round2((taxableBase * input.vatRate) / 100)
    : 0;

  const total = round2(taxableBase + vatAmount);

  const withholdingAmount = input.withholdingEnabled
    ? round2((taxableBase * input.withholdingRate) / 100)
    : 0;

  // WHT is over-and-above (borne by the client) — the full total stays payable.
  const netPayable = total;

  return {
    lineTotals,
    subtotal,
    discountAmount,
    taxableBase,
    vatAmount,
    total,
    withholdingAmount,
    netPayable,
  };
}
