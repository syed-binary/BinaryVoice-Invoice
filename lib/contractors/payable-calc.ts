import { round2 } from "../money";

/**
 * Totals for contractor invoices (payables). Deliberately simpler than
 * lib/calculations.ts — no document discount, VAT or withholding; contractors
 * bill what we pay. Keep receivables math in calculateTotals, payables here.
 */

export interface PayableLine {
  quantity: number;
  unitPrice: number;
}

export interface PayableTotals {
  lineTotals: number[];
  subtotal: number;
  total: number;
}

export function calculatePayableTotals(lines: PayableLine[]): PayableTotals {
  const lineTotals = lines.map((l) => round2(l.quantity * l.unitPrice));
  const subtotal = round2(lineTotals.reduce((s, t) => s + t, 0));
  return { lineTotals, subtotal, total: subtotal };
}
