import { describe, expect, it } from "vitest";
import { createBillSample } from "@/samples/bill-sample";
import { compareNextStatement } from "./bill-follow-up";

describe("compareNextStatement", () => {
  it("shows the unresolved portion of the new bill separately from the original and the promise", () => {
    const { first, next, call } = createBillSample();
    const result = compareNextStatement(first, next, call);
    expect(result).toMatchObject({
      first: { expectedBalanceCents: 45000, differenceCents: 15000 },
      current: { status: "above_expected", expectedBalanceCents: 45000, differenceCents: 5000 },
      changes: { billedCents: -10000, responsibilityCents: 0, postedCents: 0, differenceCents: -10000 },
      promiseDifferenceCents: 5000,
    });
    next.statement.balanceCents = 45000;
    expect(compareNextStatement(first, next, call)).toMatchObject({
      current: { status: "matches", expectedBalanceCents: 45000, differenceCents: 0 },
      promiseDifferenceCents: 0,
    });
  });

  it("can reconcile a statement when the office made no numeric promise", () => {
    const { first, next, call } = createBillSample();
    call.promisedBalanceCents = null;
    for (const record of [undefined, call]) {
      expect(compareNextStatement(first, next, record)).toMatchObject({
        current: { differenceCents: 5000 }, promiseDifferenceCents: null,
      });
    }
  });

  it("preserves an explicit zero-dollar promise as a separate comparison", () => {
    const { first, next, call } = createBillSample();
    call.promisedBalanceCents = 0;
    expect(compareNextStatement(first, next, call)).toMatchObject({
      current: { differenceCents: 5000 }, promiseDifferenceCents: 50000,
    });
  });

  it("records a new payment once on repeated checks and leaves the original data intact", () => {
    const sample = createBillSample();
    const { first, next, call } = sample;
    const firstReceipt = first.payments![0];
    next.payments = [firstReceipt, {
      ...firstReceipt, id: "receipt-2", amountCents: 5000, postedOn: "2026-05-14",
    }];
    next.statement.balanceCents = 40000;
    const before = structuredClone(sample);
    const result = compareNextStatement(first, next, call);
    expect(result).toMatchObject({
      first: { postedCents: 15000 },
      current: { postedCents: 20000, expectedBalanceCents: 40000, differenceCents: 0 },
      changes: { responsibilityCents: 0, postedCents: 5000 },
      promiseDifferenceCents: null,
    });
    expect(compareNextStatement(first, next, call)).toEqual(result);
    expect(sample).toEqual(before);
  });

  it("uses the new EOB and separates the change in the patient's share", () => {
    const { first, next, call } = createBillSample();
    next.eob = { status: "final", issuedOn: "2026-05-13", patientResponsibilityCents: 55000 };
    next.statement.balanceCents = 40000;
    expect(compareNextStatement(first, next, call)).toMatchObject({
      first: { expectedBalanceCents: 45000 },
      current: { expectedBalanceCents: 40000, differenceCents: 0 },
      changes: { responsibilityCents: -5000, postedCents: 0 },
      promiseDifferenceCents: null,
    });
  });

  it("includes a previously known receipt once its posting date passes", () => {
    const { first, next, call } = createBillSample();
    first.payments![0].postedOn = "2026-05-12";
    next.statement.balanceCents = 45000;
    expect(compareNextStatement(first, next, call)).toMatchObject({
      first: { postedCents: 0, postedAfterStatementCents: 15000 },
      current: { expectedBalanceCents: 45000, differenceCents: 0, postedCents: 15000 },
      changes: { postedCents: 15000, billedCents: -15000, differenceCents: 0 },
      promiseDifferenceCents: null,
    });
  });

  it("does not silently discard an original receipt when replacing the ledger", () => {
    const { first, next, call } = createBillSample();
    next.payments = [];
    expect(compareNextStatement(first, next, call)).toMatchObject({
      current: { status: "needs_info", differenceCents: null }, changes: null, promiseDifferenceCents: null,
    });
  });

  it("requires a matching visit and a chronological next statement", () => {
    const { first, next, call } = createBillSample();
    const otherVisit = { ...next, sameVisit: false };
    const earlier = { ...next, statement: { ...next.statement, issuedOn: "2026-05-09" } };
    for (const input of [otherVisit, earlier]) {
      expect(compareNextStatement(first, input, call)).toMatchObject({
        current: { status: "needs_info" }, changes: null, promiseDifferenceCents: null,
      });
    }
  });

  it("accepts an explicitly identified same-day corrected version", () => {
    const { first, next } = createBillSample();
    next.statement.issuedOn = first.statement.issuedOn;
    expect(compareNextStatement(first, next).current.status).toBe("needs_info");
    next.confirmedSameDayRevision = true;
    expect(compareNextStatement(first, next).current.differenceCents).toBe(5000);
  });

  it("does not carry a mismatched original case into a newly confirmed visit", () => {
    const { first, next, call } = createBillSample();
    first.sameVisit = false;
    expect(compareNextStatement(first, next, call)).toMatchObject({
      current: { status: "needs_info", differenceCents: null }, changes: null, promiseDifferenceCents: null,
    });
  });

  it("does not measure a promise against a statement issued before the call", () => {
    const { first, next, call } = createBillSample();
    call.calledOn = "2026-05-17";
    expect(compareNextStatement(first, next, call)).toMatchObject({
      current: { differenceCents: 5000 }, promiseDifferenceCents: null,
    });
  });

  it("asks which EOB applies if the replacement predates the saved version", () => {
    const { first, next, call } = createBillSample();
    next.eob = { ...first.eob, issuedOn: "2026-05-07" };
    expect(compareNextStatement(first, next, call)).toMatchObject({
      current: { status: "needs_info", expectedBalanceCents: null },
      changes: null, promiseDifferenceCents: null,
    });
  });

  it("can reconcile the latest statement once the first final EOB arrives", () => {
    const { first, next } = createBillSample();
    first.eob = { status: "pending", issuedOn: null, patientResponsibilityCents: null };
    next.eob = { status: "final", issuedOn: "2026-05-13", patientResponsibilityCents: 60000 };
    expect(compareNextStatement(first, next)).toMatchObject({
      first: { status: "needs_info" }, current: { differenceCents: 5000 }, changes: null,
    });
  });
});
