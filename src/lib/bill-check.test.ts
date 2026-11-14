import { describe, expect, it } from "vitest";
import { createBillSample } from "@/samples/bill-sample";
import { checkBill } from "./bill-check";
import type { BillInput } from "./bill-types";

describe("checkBill", () => {
  it("reconciles the sample and prepares a provider question using the entered amounts", () => {
    const { first } = createBillSample();
    const result = checkBill(first);

    expect(result).toMatchObject({
      status: "above_expected",
      expectedBalanceCents: 45000,
      differenceCents: 15000,
      postedCents: 15000,
      postedAfterStatementCents: 0,
      call: { action: "call_provider" },
    });
    expect(result.call.question).toContain("150");
    first.payments![0].amountCents = 10000;
    const edited = checkBill(first);
    expect(edited).toMatchObject({ expectedBalanceCents: 50000, differenceCents: 10000 });
    expect(edited.call.question).toContain("100");
  });

  it("includes receipts posted on the issue date and shows later receipts separately", () => {
    const { first } = createBillSample();
    first.payments![0].postedOn = "2026-05-10";
    expect(checkBill(first).postedCents).toBe(15000);

    first.payments![0].postedOn = "2026-05-12";
    expect(checkBill(first)).toMatchObject({
      expectedBalanceCents: 60000,
      differenceCents: 0,
      postedCents: 0,
      postedAfterStatementCents: 15000,
      call: { action: "check_portal" },
    });
  });

  it("deduplicates the same receipt by ID, while counting separate receipts of the same amount", () => {
    const { first } = createBillSample();
    const receipt = first.payments![0];
    first.payments = [receipt, { ...receipt }, { ...receipt, id: "receipt-2" }];
    expect(checkBill(first)).toMatchObject({ postedCents: 30000, expectedBalanceCents: 30000 });
  });

  it("asks for detail when one receipt ID has conflicting values", () => {
    const { first } = createBillSample();
    const receipt = first.payments![0];
    first.payments!.push({ ...receipt, amountCents: 14999 });
    expect(checkBill(first)).toMatchObject({ status: "needs_info", differenceCents: null });
  });

  it("keeps receipts for other visits out of the total", () => {
    const { first } = createBillSample();
    first.payments![0].allocation = "other_visit";
    expect(checkBill(first)).toMatchObject({ postedCents: 0, expectedBalanceCents: 60000 });
  });

  it("distinguishes unknown payments from confirmed zero", () => {
    const { first } = createBillSample();
    first.payments = null;
    expect(checkBill(first)).toMatchObject({ status: "needs_info", differenceCents: null });
    first.payments = [];
    expect(checkBill(first)).toMatchObject({ status: "matches", postedCents: 0, differenceCents: 0 });
  });

  it("can render an empty guest form without inventing amounts", () => {
    const empty: BillInput = {
      visitDate: null,
      sameVisit: null,
      eob: { status: "unknown", issuedOn: null, patientResponsibilityCents: null },
      statement: { scope: "unknown", issuedOn: null, balanceCents: null },
      payments: null,
    };
    expect(checkBill(empty)).toMatchObject({
      status: "needs_info", expectedBalanceCents: null, differenceCents: null, postedCents: null,
    });
  });

  it("accepts a documented zero balance and zero responsibility", () => {
    const { first } = createBillSample();
    first.eob.patientResponsibilityCents = 0;
    first.statement.balanceCents = 0;
    first.payments = [];
    expect(checkBill(first)).toMatchObject({ status: "matches", expectedBalanceCents: 0, differenceCents: 0 });
  });

  it("uses exact cents and reports a lower statement with a signed difference", () => {
    const { first } = createBillSample();
    first.eob.patientResponsibilityCents = 3001;
    first.payments![0].amountCents = 1002;
    first.statement.balanceCents = 1998;
    expect(checkBill(first)).toMatchObject({
      status: "below_expected", expectedBalanceCents: 1999, differenceCents: -1,
    });
  });

  it("flags a possible credit if confirmed receipts exceed the patient's share", () => {
    const { first } = createBillSample();
    first.eob.patientResponsibilityCents = 14500;
    first.statement.balanceCents = 0;
    expect(checkBill(first)).toMatchObject({ status: "possible_credit", possibleCreditCents: 500 });
  });

  it("directs a patient with a pending EOB to the insurer", () => {
    const { first } = createBillSample();
    first.eob.status = "pending";
    expect(checkBill(first)).toMatchObject({
      status: "needs_info", differenceCents: null, call: { action: "call_insurer" },
    });
  });

  const incomplete: [string, (bill: BillInput) => void][] = [
    ["different provider or visit", bill => { bill.sameVisit = false; }],
    ["unconfirmed visit", bill => { bill.sameVisit = null; }],
    ["family balance", bill => { bill.statement.scope = "combined"; }],
    ["minimum installment", bill => { bill.statement.scope = "minimum_due"; }],
    ["missing balance", bill => { bill.statement.balanceCents = null; }],
    ["unknown patient responsibility", bill => { bill.eob.patientResponsibilityCents = null; }],
    ["receipt without a posting date", bill => { bill.payments![0].postedOn = null; }],
    ["receipt without a confirmed allocation", bill => { bill.payments![0].allocation = "unknown"; }],
    ["EOB dated after the statement", bill => { bill.eob.issuedOn = "2026-05-12"; }],
    ["invalid calendar date", bill => { bill.statement.issuedOn = "2026-04-31"; }],
    ["fractional cents", bill => { bill.statement.balanceCents = 0.1; }],
    ["unsafe integer", bill => { bill.statement.balanceCents = Number.MAX_SAFE_INTEGER + 1; }],
  ];
  it.each(incomplete)("requests clarification for %s", (_, edit) => {
    const { first } = createBillSample();
    edit(first);
    const result = checkBill(first);
    expect(result).toMatchObject({ status: "needs_info", expectedBalanceCents: null, differenceCents: null });
    expect(result.call.question.trim()).not.toBe("");
  });
});
