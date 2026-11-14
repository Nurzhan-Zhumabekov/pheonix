import { describe, expect, it } from "vitest";
import { emptyBillDraft, sampleDrafts, toBillInput, toCallRecord, toNextStatementInput } from "./bill-draft";
import { applyBillPaste, isDifferentVisit, parseBillText } from "./bill-paste";
import { checkBill } from "./bill-check";
import { compareNextStatement } from "./bill-follow-up";

describe("quick demo scenarios", () => {
  it("runs all four fictional cases through the standard reconciliation", () => {
    const defaultCase = sampleDrafts("copay");
    expect(compareNextStatement(toBillInput(defaultCase.first), toNextStatementInput(defaultCase.next),
      toCallRecord(defaultCase.call)).current.differenceCents).toBe(5000);
    const late = sampleDrafts("late-payment");
    expect(checkBill(toBillInput(late.first)).call.action).toBe("check_portal");
    late.first.payments[0].postedOn = "2026-05-06";
    expect(checkBill(toBillInput(late.first)).differenceCents).toBe(15000);
    const credit = sampleDrafts("credit");
    expect(compareNextStatement(toBillInput(credit.first), toNextStatementInput(credit.next)).current)
      .toMatchObject({ status: "possible_credit", possibleCreditCents: 5000 });
    credit.next.responsibility = "149.99";
    expect(compareNextStatement(toBillInput(credit.first), toNextStatementInput(credit.next)).current.possibleCreditCents).toBe(1);
    expect(checkBill(toBillInput(sampleDrafts("pending").first)).call.action).toBe("call_insurer");
    expect(sampleDrafts("copay").first.payments[0].postedOn).toBe("2026-05-06");
  });
});

const example = "Visit 2026-05-05, EOB patient responsibility $600, paid $150 on 2026-05-06, statement balance $600 on 2026-05-10";

describe("smart paste", () => {
  it("previews only supplied fields and distinguishes paying from posting", () => {
    const preview = parseBillText(example);
    expect(preview).toEqual({
      fields: { visitDate: "2026-05-05", responsibility: "600.00", balance: "600.00", statementDate: "2026-05-10" },
      receipt: { amount: "150.00", paidOn: "2026-05-06", postedOn: "" }, notes: [],
    });
    const empty = emptyBillDraft();
    const draft = { ...empty, ...applyBillPaste(empty, preview, false) };
    expect(draft).toMatchObject({ sameVisit: false, eobStatus: "unknown", paymentsKnown: false,
      payments: [{ postedOn: "", allocation: "unknown" }] });
    const confirmed = { ...draft, ...applyBillPaste(draft, preview, true) };
    expect(confirmed.payments).toHaveLength(1);
    expect(confirmed.payments[0].postedOn).toBe("2026-05-06");
    expect(applyBillPaste(confirmed, preview, true).payments).toBeUndefined();
  });

  it("preserves manually entered fields and existing receipts when importing a subset", () => {
    const draft = sampleDrafts().first;
    const preview = parseBillText("Patient share: $1,200.09; payment posted $29.11 on 5/14/2026");
    const updated = { ...draft, ...applyBillPaste(draft, preview, false) };
    expect(updated.eobDate).toBe(draft.eobDate);
    expect(updated.responsibility).toBe("1200.09");
    expect(updated.payments[0]).toEqual(draft.payments[0]);
    expect(updated.payments[1]).toMatchObject({ amount: "29.11", postedOn: "2026-05-14", allocation: "unknown" });
  });

  it("keeps a second visit and its receipt separate from the open visit", () => {
    const open = sampleDrafts().first;
    const preview = parseBillText("Visit 2026-06-05; payment posted $40 on 2026-06-06");
    expect(isDifferentVisit(open.visitDate, preview.fields.visitDate)).toBe(true);
    const other = { ...emptyBillDraft(), ...applyBillPaste(open, preview, false) };
    expect(other.visitDate).toBe("2026-06-05");
    expect(other.eobStatus).toBe("unknown");
    expect(other.payments).toHaveLength(1);
    expect(other.payments[0]).toMatchObject({ amount: "40.00", postedOn: "2026-06-06", allocation: "unknown" });
    expect(open.payments[0].amount).toBe("150.00");
    const sameVisit = parseBillText("Visit 2026-05-05; payment posted $40 on 2026-06-06");
    expect(isDifferentVisit(open.visitDate, sameVisit.fields.visitDate)).toBe(false);
    expect(applyBillPaste(open, sameVisit, false).payments).toHaveLength(2);
    expect(isDifferentVisit(open.visitDate, undefined)).toBe(false);
  });

  it("keeps a due date distinct from the issue date and insurer payments distinct from patient receipts", () => {
    const preview = parseBillText("Date of service: 05/05/2026; EOB issued on 5/7/2026; balance due $0.00 by 5/31/2026; insurance paid $640.10");
    expect(preview.fields).toEqual({ visitDate: "2026-05-05", eobDate: "2026-05-07", balance: "0.00" });
    expect(preview.receipt).toBeUndefined();
  });

  it("withholds ambiguous and invalid values", () => {
    expect(parseBillText("visit 2026-05-05; visit 2026-06-05; patient share $200").fields).toEqual({});
    const preview = parseBillText("Patient share: $12.999; statement balance $100; statement balance $200.00");
    expect(preview.fields).toEqual({});
    expect(preview.notes.length).toBeGreaterThan(0);
    expect(parseBillText("Date of visit 2026-02-31; balance due $100").fields).toEqual({});
    const ambiguous = parseBillText("Paid $20 on 2026-05-05; paid $30 on 2026-05-06");
    expect(ambiguous.receipt).toBeUndefined();
    expect(ambiguous.notes.length).toBe(1);
    expect(parseBillText("Paid $20 on 2026-05-05 and paid $30 on 2026-05-06").receipt).toBeUndefined();
    expect(applyBillPaste(emptyBillDraft(), parseBillText("unrecognized free text"), false)).toEqual({});
  });
});
