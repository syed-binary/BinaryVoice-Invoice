import { describe, expect, it } from "vitest";
import { calculateTotals, type CalcInput } from "./calculations";

const base: CalcInput = {
  lines: [{ quantity: 2, unitPrice: 10000, discount: 0 }],
  discountType: "FIXED",
  discountValue: 0,
  vatEnabled: false,
  vatRate: 5,
  withholdingEnabled: false,
  withholdingRate: 0,
};

describe("calculateTotals", () => {
  it("sums line nets into the subtotal", () => {
    const r = calculateTotals({
      ...base,
      lines: [
        { quantity: 2, unitPrice: 10000, discount: 0 },
        { quantity: 1, unitPrice: 5000, discount: 500 },
      ],
    });
    expect(r.lineTotals).toEqual([20000, 4500]);
    expect(r.subtotal).toBe(24500);
    expect(r.total).toBe(24500);
  });

  it("applies a percent discount on the subtotal", () => {
    const r = calculateTotals({ ...base, discountType: "PERCENT", discountValue: 10 });
    expect(r.discountAmount).toBe(2000);
    expect(r.taxableBase).toBe(18000);
  });

  it("clamps a fixed discount to the subtotal and never below zero", () => {
    expect(
      calculateTotals({ ...base, discountValue: 99999 }).discountAmount,
    ).toBe(20000);
    expect(
      calculateTotals({ ...base, discountValue: -50 }).discountAmount,
    ).toBe(0);
  });

  it("adds VAT on the taxable base", () => {
    const r = calculateTotals({
      ...base,
      discountType: "PERCENT",
      discountValue: 10,
      vatEnabled: true,
      vatRate: 5,
    });
    expect(r.vatAmount).toBe(900); // 5% of 18000
    expect(r.total).toBe(18900);
  });

  it("zero-rates VAT for export clients (rate 0)", () => {
    const r = calculateTotals({ ...base, vatEnabled: true, vatRate: 0 });
    expect(r.vatAmount).toBe(0);
    expect(r.total).toBe(20000);
  });

  it("discloses withholding without reducing the payable total", () => {
    const r = calculateTotals({
      ...base,
      vatEnabled: true,
      vatRate: 0,
      withholdingEnabled: true,
      withholdingRate: 20,
    });
    expect(r.withholdingAmount).toBe(4000); // 20% of taxable base
    expect(r.netPayable).toBe(r.total); // WHT is borne by the client, over and above
  });

  it("rounds to 2 decimals at each step", () => {
    const r = calculateTotals({
      ...base,
      lines: [{ quantity: 3, unitPrice: 33.335, discount: 0 }],
      vatEnabled: true,
      vatRate: 5,
    });
    expect(r.subtotal).toBe(100.01);
    expect(r.vatAmount).toBe(5);
    expect(r.total).toBe(105.01);
  });
});
