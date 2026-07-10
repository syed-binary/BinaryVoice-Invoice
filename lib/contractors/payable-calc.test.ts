import { describe, expect, it } from "vitest";
import { calculatePayableTotals } from "./payable-calc";
import { margin } from "./margin";

describe("calculatePayableTotals", () => {
  it("sums line totals with rounding", () => {
    const r = calculatePayableTotals([
      { quantity: 1, unitPrice: 8000 },
      { quantity: 2.5, unitPrice: 401.333 },
    ]);
    expect(r.lineTotals).toEqual([8000, 1003.33]);
    expect(r.subtotal).toBe(9003.33);
    expect(r.total).toBe(9003.33);
  });

  it("handles empty lines", () => {
    expect(calculatePayableTotals([]).total).toBe(0);
  });
});

describe("margin", () => {
  it("computes amount and percentage in base currency", () => {
    const m = margin(29380, 55087.5); // e.g. USD 8k cost vs AED bill
    expect(m.amount).toBe(25707.5);
    expect(m.pct).toBeCloseTo(46.67, 2);
  });

  it("returns null pct when there is no bill amount", () => {
    expect(margin(1000, 0)).toEqual({ amount: -1000, pct: null });
  });
});
