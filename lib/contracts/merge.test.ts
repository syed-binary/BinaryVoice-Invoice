import { describe, expect, it } from "vitest";
import { extractFields, renderTemplate } from "./merge";
import { jurisdictionFor } from "./jurisdictions";

describe("renderTemplate", () => {
  const vars = {
    contractor: { name: "Priya Sharma", country: "India" },
    engagement: { costRate: "4,500.00", rateUnit: "month" },
    today: "11 July 2026",
  };

  it("resolves dot-path fields", () => {
    const r = renderTemplate(
      "Dear {{contractor.name}}, rate {{engagement.costRate}}/{{engagement.rateUnit}} as of {{ today }}.",
      vars,
    );
    expect(r.text).toBe("Dear Priya Sharma, rate 4,500.00/month as of 11 July 2026.");
    expect(r.missing).toEqual([]);
  });

  it("marks unresolved fields and reports them", () => {
    const r = renderTemplate("Notice: {{contract.noticePeriodDays}} days for {{contractor.name}}.", vars);
    expect(r.text).toContain("**[missing: contract.noticePeriodDays]**");
    expect(r.missing).toEqual(["contract.noticePeriodDays"]);
  });

  it("dedupes repeated missing fields", () => {
    const r = renderTemplate("{{x.y}} and {{x.y}}", {});
    expect(r.missing).toEqual(["x.y"]);
  });
});

describe("extractFields", () => {
  it("lists unique fields in order", () => {
    expect(extractFields("{{a}} {{b.c}} {{a}}")).toEqual(["a", "b.c"]);
  });
});

describe("jurisdictionFor", () => {
  it("maps common country spellings", () => {
    expect(jurisdictionFor("United Kingdom")).toBe("GB");
    expect(jurisdictionFor("uk")).toBe("GB");
    expect(jurisdictionFor("India")).toBe("IN");
    expect(jurisdictionFor("UAE")).toBe("AE");
  });

  it("passes through ISO codes and rejects unknowns", () => {
    expect(jurisdictionFor("DE")).toBe("DE");
    expect(jurisdictionFor("Atlantis")).toBeNull();
  });
});
