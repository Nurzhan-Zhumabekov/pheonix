import { describe, expect, it } from "vitest";
import { createBillSample } from "../samples/bill-sample";
import {
  emptyBillDraft,
  emptyCallDraft,
  emptyNextDraft,
  sampleDrafts,
  toBillInput,
  toCallRecord,
  toNextStatementInput,
} from "./bill-draft";

describe("BillShield draft conversion", () => {
  it("recreates the original guest sample with fresh, independently editable receipts", () => {
    const draft = sampleDrafts();
    const sample = createBillSample();

    expect(toBillInput(draft.first)).toEqual(sample.first);
    expect(toCallRecord(draft.call)).toEqual(sample.call);
    expect(toNextStatementInput(draft.next)).toEqual(sample.next);

    draft.next.payments[0].amount = "42.50";
    expect(toBillInput(draft.first).payments).toEqual(sample.first.payments);
    expect(toBillInput(sampleDrafts().first)).toEqual(sample.first);
  });

  it("distinguishes unknown receipts, confirmed zero receipts, and incomplete entries", () => {
    const draft = emptyBillDraft();
    draft.responsibility = "$1,234.56";
    draft.balance = "0";

    expect(toBillInput(draft)).toEqual({
      visitDate: null,
      sameVisit: false,
      eob: { status: "unknown", issuedOn: null, patientResponsibilityCents: 123456 },
      statement: { scope: "unknown", issuedOn: null, balanceCents: 0 },
      payments: null,
    });
    expect(toBillInput({ ...draft, paymentsKnown: true }).payments).toEqual([]);

    draft.paymentsKnown = true;
    draft.payments.push({ id: "receipt-a", amount: "1.999", postedOn: "", allocation: "unknown" });
    expect(toBillInput(draft).payments).toEqual([
      { id: "receipt-a", amountCents: null, postedOn: null, allocation: "unknown" },
    ]);
  });

  it("allows no call or a partially recorded call, including a promised zero balance", () => {
    expect(toCallRecord(emptyCallDraft())).toBeNull();
    expect(toCallRecord({ calledOn: "", promisedBalance: "0", followUpOn: "2026-06-04" })).toEqual({
      calledOn: null,
      promisedBalanceCents: 0,
      followUpOn: "2026-06-04",
    });
  });

  it("leaves original EOB and receipts in effect unless explicitly edited", () => {
    const draft = emptyNextDraft();
    draft.eobStatus = "final";
    draft.eobDate = "2026-06-03";
    draft.responsibility = "500.25";
    draft.sameDayRevision = true;

    expect(toNextStatementInput(draft)).toEqual({
      sameVisit: false,
      statement: { scope: "unknown", issuedOn: null, balanceCents: null },
      confirmedSameDayRevision: true,
    });
    expect(toNextStatementInput({ ...draft, editEob: true, editPayments: true })).toMatchObject({
      eob: { status: "final", issuedOn: "2026-06-03", patientResponsibilityCents: 50025 },
      payments: null,
    });
    expect(toNextStatementInput({ ...draft, editPayments: true, paymentsKnown: true }).payments).toEqual([]);
  });
});
