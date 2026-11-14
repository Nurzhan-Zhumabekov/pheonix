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
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
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
    writeSavedCase(storage, demo, "sample");
    const migrated = readSavedCases(storage).visits;
    expect(migrated.map(visit => visit.draft)).toEqual([own]);
    expect(readSavedCases(storage).sample).toEqual(demo);
    clearSavedCase(storage, true, null);
    expect(readSavedCases(storage)).toEqual({ visits: migrated, sample: null });
    own.call.promisedBalance = "75";
    writeSavedCase(storage, own, migrated[0].id);
    expect(storage.getItem("billshield:guest-case:v1")).toBeNull();
    expect(readSavedCases(storage).visits.map(visit => visit.draft)).toEqual([own]);
  });

  it("keeps old sample cases available for resume and clears only the requested case", () => {
    const storage = memoryStorage();
    const demo = guestCase(true);
    storage.setItem("billshield:guest-case:v1", JSON.stringify(demo));
    expect(readSavedCases(storage)).toEqual({ visits: [], sample: demo });
    writeSavedCase(storage, guestCase(false), "new-visit");
    clearSavedCase(storage, false, "new-visit");
    expect(readSavedCases(storage)).toEqual({ visits: [], sample: demo });
    clearSavedCase(storage, true, null);
    expect(readSavedCases(storage)).toEqual({ visits: [], sample: null });
  });

  it("rejects malformed JSON and malformed nested drafts before Resume; valid slots survive", () => {
    const storage = memoryStorage();
    const demo = guestCase(true);
    writeSavedCase(storage, demo, "sample");
    const malformed = guestCase(false);
    for (const raw of [
      "{", "null", JSON.stringify({ first: {}, call: {}, next: {}, checked: true }),
      JSON.stringify({ ...malformed, first: { ...malformed.first, visitDate: 5 } }),
      JSON.stringify({ ...malformed, next: { ...malformed.next, payments: [null] } }),
      JSON.stringify({ ...malformed, call: { ...malformed.call, promisedBalance: {} } }),
    ]) {
      storage.setItem("billshield:guest-case:v1", raw);
      expect(readSavedCases(storage)).toEqual({ visits: [], sample: demo });
    }
  });

  it("keeps legacy personal and demo slots when adding, updating and deleting a second real visit", () => {
    const storage = memoryStorage();
    const own = guestCase(false);
    const demo = guestCase(true);
    storage.setItem("billshield:personal-case:v1", JSON.stringify(own));
    storage.setItem("billshield:sample-case:v1", JSON.stringify(demo));
    const second = guestCase(false);
    second.first.balance = "799.99";
    writeSavedCase(storage, second, "new-id", "Visit two");
    writeSavedCase(storage, { ...second, resolved: true }, "new-id", "Updated name");
    const { visits, sample } = readSavedCases(storage);
    expect(visits).toHaveLength(2);
    expect(visits[0]).toMatchObject({ id: "new-id", label: "Updated name", draft: { resolved: true } });
    expect(visits[1].draft).toEqual(own);
    expect(sample).toEqual(demo);
    storage.setItem("billshield:visit:v2:broken", "{");
    clearSavedCase(storage, false, visits[1].id);
    expect(readSavedCases(storage)).toEqual({ visits: [visits[0]], sample: demo });
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
