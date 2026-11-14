import { describe, expect, it } from "vitest";
import { sampleDrafts } from "./bill-draft";
import { compareNextStatement } from "./bill-follow-up";
import {
  clearSavedCase, readSavedCases, resolutionState, writeSavedCase, type GuestCase,
} from "./bill-guest-case";
import { createBillSample } from "../samples/bill-sample";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

function guestCase(sample: boolean): GuestCase {
  return { ...sampleDrafts(), sample, checked: true, callOpen: true, nextOpen: true,
    compared: true, resolved: false };
}

describe("saved guest cases", () => {
  it("resumes a valid personal v1 case after saving, resolving and clearing a sample", () => {
    const storage = memoryStorage();
    const own = guestCase(false);
    own.first.balance = "78.90";
    storage.setItem("billshield:guest-case:v1", JSON.stringify(own));
    const demo = { ...guestCase(true), resolved: true };
    writeSavedCase(storage, demo);
    expect(readSavedCases(storage)).toEqual({ personal: own, sample: demo });
    clearSavedCase(storage, true);
    expect(readSavedCases(storage)).toEqual({ personal: own, sample: null });
    own.call.promisedBalance = "75";
    writeSavedCase(storage, own);
    expect(storage.getItem("billshield:guest-case:v1")).toBeNull();
    expect(readSavedCases(storage).personal).toEqual(own);
  });

  it("keeps old sample cases available for resume and clears only the requested case", () => {
    const storage = memoryStorage();
    const demo = guestCase(true);
    storage.setItem("billshield:guest-case:v1", JSON.stringify(demo));
    expect(readSavedCases(storage)).toEqual({ personal: null, sample: demo });
    writeSavedCase(storage, guestCase(false));
    clearSavedCase(storage, false);
    expect(readSavedCases(storage)).toEqual({ personal: null, sample: demo });
    clearSavedCase(storage, true);
    expect(readSavedCases(storage)).toEqual({ personal: null, sample: null });
  });

  it("rejects malformed JSON and malformed nested drafts before Resume; valid slots survive", () => {
    const storage = memoryStorage();
    const demo = guestCase(true);
    writeSavedCase(storage, demo);
    const malformed = guestCase(false);
    for (const raw of [
      "{", "null", JSON.stringify({ first: {}, call: {}, next: {}, checked: true }),
      JSON.stringify({ ...malformed, first: { ...malformed.first, visitDate: 5 } }),
      JSON.stringify({ ...malformed, next: { ...malformed.next, payments: [null] } }),
      JSON.stringify({ ...malformed, call: { ...malformed.call, promisedBalance: {} } }),
    ]) {
      storage.setItem("billshield:guest-case:v1", raw);
      expect(readSavedCases(storage)).toEqual({ personal: null, sample: demo });
    }
  });
});

describe("whether a user can close the case", () => {
  it.each([null, "2026-05-09", "2026-05-16", "2026-05-17"])("keeps a promise open for call date %s", calledOn => {
    const { first, next, call } = createBillSample();
    next.statement.balanceCents = 45000;
    const promised = { ...call, calledOn, promisedBalanceCents: 0 };
    const result = compareNextStatement(first, next, promised);
    expect(result.current.status).toBe("matches");
    expect(resolutionState(result, promised, first.statement.issuedOn, next.statement.issuedOn)).not.toBe("ready");
  });

  it("allows a matching balance after the call when a new payment changes the basis", () => {
    const { first, next, call } = createBillSample();
    next.payments = [...first.payments!, {
      id: "receipt-2", postedOn: "2026-05-15", amountCents: 5000, allocation: "this_visit",
    }];
    next.statement.balanceCents = 40000;
    const result = compareNextStatement(first, next, call);
    expect(result.promiseDifferenceCents).toBeNull();
    expect(resolutionState(result, call, first.statement.issuedOn, next.statement.issuedOn)).toBe("ready");
  });

  it("keeps a comparable, unmet promise open; a visit without a promise can be closed", () => {
    const { first, next, call } = createBillSample();
    next.statement.balanceCents = 45000;
    call.promisedBalanceCents = 30000;
    expect(resolutionState(compareNextStatement(first, next, call), call,
      first.statement.issuedOn, next.statement.issuedOn)).toBe("open");
    expect(resolutionState(compareNextStatement(first, next), null,
      first.statement.issuedOn, next.statement.issuedOn)).toBe("ready");
  });
});
