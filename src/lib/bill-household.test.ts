import { describe, expect, it } from "vitest";
import { sampleDrafts } from "./bill-draft";
import type { GuestCase, SavedVisit } from "./bill-guest-case";
import { householdTotals } from "./bill-household";

function personal(): GuestCase {
  return { ...sampleDrafts(), sample: false, checked: true, callOpen: true, nextOpen: true, compared: true, resolved: false };
}
function visit(id: string, draft: GuestCase): SavedVisit {
  return { id, draft, label: id, updatedAt: 0 };
}

describe("household tracker", () => {
  it("uses positive initial gaps once per visit and applies live edits", () => {
    const one = personal();
    const second = personal();
    second.first.balance = "480.00"; // Initial gap is $30, irrespective of follow-up.
    second.resolved = true;
    const visits = [visit("one", one), visit("two", second)];
    const edited = { ...one, first: { ...one.first, balance: "550.00" } };
    expect(householdTotals(visits, edited, "one", "all")).toEqual({ active: 1, resolved: 1, flaggedCents: 13000 });
    expect(householdTotals(visits, { ...edited, sample: true }, null, "all")).toEqual({ active: 1, resolved: 1, flaggedCents: 18000 });
    expect(householdTotals(visits, { ...one, checked: false }, null, "all").active).toBe(1);
    expect(householdTotals(visits, edited, null, "all").active).toBe(2);
  });
  it("filters by visit year and excludes unknown or negative amounts from money flagged", () => {
    const old = personal();
    old.first.visitDate = "2025-05-05";
    const uncertain = personal();
    uncertain.first.eobStatus = "pending";
    const lower = personal();
    lower.first.balance = "0";
    const visits = [visit("old", old), visit("uncertain", uncertain)];
    expect(householdTotals(visits, lower, null, "2026")).toEqual({ active: 2, resolved: 0, flaggedCents: 0 });
    expect(householdTotals(visits, lower, null, "2025").flaggedCents).toBe(15000);
    expect(householdTotals([], { ...lower, sample: true }, null, "all").flaggedCents).toBe(0);
  });
});
