import { afterEach, expect, it, vi } from "vitest";
import { sampleDrafts } from "./bill-draft";
import type { GuestCase } from "./bill-guest-case";
import { pricingReport, rememberOpenCheck } from "./pricing-report";

function checkedVisit(): GuestCase {
  return { ...sampleDrafts(), sample: false, checked: true, compared: false, resolved: false, callOpen: false, nextOpen: false };
}

afterEach(() => {
  rememberOpenCheck({ ...checkedVisit(), checked: false });
  vi.unstubAllGlobals();
});

it("prints the current edits and includes only the steps opened or compared by the user", () => {
  const current = checkedVisit();
  current.first.balance = "731.55";
  rememberOpenCheck(current);
  expect(pricingReport()).toMatchObject({ sample: false, first: { statement: { balanceCents: 73155 } }, call: null, next: null });
  rememberOpenCheck({ ...current, callOpen: true, compared: true });
  expect(pricingReport()).toMatchObject({ call: { promisedBalanceCents: 45000 }, next: { statement: { balanceCents: 50000 } } });
});

it("uses the stored personal visit on a fresh Pricing page", () => {
  const guest = checkedVisit();
  guest.first.balance = "834";
  vi.stubGlobal("window", { localStorage: { length: 0, getItem: (key: string) =>
    key === "billshield:personal-case:v1" ? JSON.stringify(guest) : null } });
  expect(pricingReport()).toMatchObject({ sample: false, first: { statement: { balanceCents: 83400 } } });
});

it("offers the complete fictional report when a visitor cannot access storage", () => {
  vi.stubGlobal("window", { get localStorage() { throw new Error("storage disabled"); } });
  expect(pricingReport()).toMatchObject({ sample: true, next: { statement: { balanceCents: 50000 } } });
});
