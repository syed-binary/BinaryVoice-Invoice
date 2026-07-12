import { describe, expect, it } from "vitest";
import { gratuityAccrual } from "./gratuity";
import { generateSif } from "./wps";

describe("gratuityAccrual", () => {
  const basic = 12000; // AED/month → daily 400

  it("accrues nothing under one year of service", () => {
    expect(
      gratuityAccrual(new Date("2026-01-01"), new Date("2026-11-30"), basic).accrued,
    ).toBe(0);
  });

  it("pays 21 days of basic per year within the first five years", () => {
    const r = gratuityAccrual(new Date("2023-07-12"), new Date("2026-07-12"), basic);
    // ~3 years × 21 days × 400/day ≈ 25,200
    expect(r.accrued).toBeGreaterThan(25100);
    expect(r.accrued).toBeLessThan(25300);
  });

  it("pays 30 days per year beyond five years", () => {
    const r = gratuityAccrual(new Date("2019-07-12"), new Date("2026-07-12"), basic);
    // 5×21×400 + ~2×30×400 = 42,000 + 24,000 ≈ 66,000
    expect(r.accrued).toBeGreaterThan(65800);
    expect(r.accrued).toBeLessThan(66200);
  });

  it("caps at two years' basic pay", () => {
    const r = gratuityAccrual(new Date("1990-01-01"), new Date("2026-07-12"), basic);
    expect(r.accrued).toBe(basic * 24);
  });
});

describe("generateSif", () => {
  it("emits one EDR per employee and a closing SCR with totals", () => {
    const sif = generateSif({
      employerMolId: "1234567890123",
      employerBankCode: "BANKAEXX",
      fileCreationDate: new Date("2026-07-31T10:30:00"),
      periodYear: 2026,
      periodMonth: 7,
      employees: [
        { molEmployeeId: "12345678901234", agentId: "AGT1", iban: "AE07033123", daysInPeriod: 31, fixedPay: 15000, variablePay: 500 },
        { molEmployeeId: "22345678901234", agentId: "AGT2", iban: "AE07033456", daysInPeriod: 31, fixedPay: 9000, variablePay: 0 },
      ],
    });
    const lines = sif.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("EDR,12345678901234,AGT1,AE07033123,20260731,31,15000.00,500.00,0");
    expect(lines[2]).toContain("SCR,1234567890123,BANKAEXX,20260731,");
    expect(lines[2]).toContain(",202607,2,24500.00,AED");
  });
});
