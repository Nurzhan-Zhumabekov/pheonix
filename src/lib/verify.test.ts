import { describe, expect, it } from "vitest";
import { countUnverified, normalize, quoteIsInDocument, verifyPlan } from "./verify";
import { RAW_PLAN, SAMPLE_TEXT } from "./test-fixtures";

describe("quote verification", () => {
  it("ignores case, curly quotes and line breaks", () => {
    const doc = normalize("Take 1 tablet\ntwice a day -- with  “food”");
    expect(quoteIsInDocument('TAKE 1 tablet twice a day -- with "food"', doc)).toBe(true);
  });

  it("rejects a quote that is not in the document", () => {
    expect(quoteIsInDocument("Take 3 tablets at night", normalize(SAMPLE_TEXT))).toBe(false);
  });

  it("rejects empty or tiny quotes", () => {
    expect(quoteIsInDocument("", normalize(SAMPLE_TEXT))).toBe(false);
    expect(quoteIsInDocument("a", normalize(SAMPLE_TEXT))).toBe(false);
  });
});

describe("verifyPlan", () => {
  it("marks every item of the sample plan as verified", () => {
    expect(countUnverified(verifyPlan(RAW_PLAN, SAMPLE_TEXT))).toBe(0);
  });

  it("flags but keeps an item whose quote was invented", () => {
    const tampered = structuredClone(RAW_PLAN);
    tampered.medications[0].source_quote = "Take 4 tablets every hour";
    const plan = verifyPlan(tampered, SAMPLE_TEXT);
    expect(plan.medications).toHaveLength(RAW_PLAN.medications.length);
    expect(plan.medications[0].verified).toBe(false);
    expect(countUnverified(plan)).toBe(1);
  });
});
