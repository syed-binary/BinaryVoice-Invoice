import { describe, expect, it, vi } from "vitest";
import { resolveRate, toBase, USD_PEGS, type EcbFetch } from "./fx-core";

const noEcb: EcbFetch = async () => {
  throw new Error("ECB should not be called");
};

describe("toBase", () => {
  it("converts and rounds to 2 decimals", () => {
    expect(toBase(1000, 4.7101)).toBe(4710.1);
    expect(toBase(333.33, 3.6725)).toBe(1224.15);
    expect(toBase(0, 5)).toBe(0);
  });
});

describe("resolveRate", () => {
  it("returns 1 for same currency without fetching", async () => {
    expect(await resolveRate("AED", "AED", noEcb)).toBe(1);
  });

  it("crosses two pegged currencies via their USD pegs", async () => {
    expect(await resolveRate("SAR", "AED", noEcb)).toBeCloseTo(
      USD_PEGS.AED / USD_PEGS.SAR,
      10,
    );
  });

  it("uses the peg directly for USD→AED and AED→USD", async () => {
    expect(await resolveRate("USD", "AED", noEcb)).toBe(3.6725);
    expect(await resolveRate("AED", "USD", noEcb)).toBeCloseTo(1 / 3.6725, 10);
  });

  it("routes GBP→AED via ECB GBP→USD times the peg", async () => {
    const ecb = vi.fn(async (from: string, to: string) =>
      from === "GBP" && to === "USD" ? 1.28 : null,
    );
    expect(await resolveRate("GBP", "AED", ecb)).toBeCloseTo(1.28 * 3.6725, 10);
    expect(ecb).toHaveBeenCalledOnce();
  });

  it("routes AED→GBP via the peg then ECB USD→GBP", async () => {
    const ecb = vi.fn(async (from: string, to: string) =>
      from === "USD" && to === "GBP" ? 0.78 : null,
    );
    expect(await resolveRate("AED", "GBP", ecb)).toBeCloseTo(0.78 / 3.6725, 10);
  });

  it("delegates unpegged pairs straight to ECB", async () => {
    const ecb = vi.fn(async () => 0.92);
    expect(await resolveRate("USD", "EUR", ecb)).toBe(0.92);
  });

  it("propagates null when ECB has no rate", async () => {
    const ecb: EcbFetch = async () => null;
    expect(await resolveRate("GBP", "AED", ecb)).toBeNull();
    expect(await resolveRate("USD", "EUR", ecb)).toBeNull();
  });
});
