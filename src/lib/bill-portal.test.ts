import { describe, expect, it } from "vitest";
import { createBillSample } from "@/samples/bill-sample";
import { checkBill } from "./bill-check";
import { buildPortalMessage } from "./bill-portal";
import type { BillInput } from "./bill-types";

const message = (bill: BillInput) => buildPortalMessage(bill, checkBill(bill));

describe("portal message", () => {
  it("uses edited dates and exact amounts from the statement, EOB and receipt", () => {
    const { first } = createBillSample();
    first.eob.patientResponsibilityCents = 58705;
    first.payments![0].amountCents = 14701;
    first.visitDate = "2026-05-04";
    const text = message(first);
    for (const word of ["May 4, 2026", "May 6, 2026", "$587.05", "$147.01", "$440.04", "in writing"]) {
      expect(text).toContain(word);
    }
  });

  it("addresses a pending claim to member services with no assertion of a final patient share", () => {
    const { first } = createBillSample();
    first.eob.status = "pending";
    const text = message(first);
    expect(text).toContain("Member Services");
    expect(text).toContain("claim");
    expect(text).not.toContain("$600.00");
  });

  it("distinguishes a payment made after the issue date from an unresolved difference", () => {
    const { first } = createBillSample();
    first.payments![0].postedOn = "2026-05-12";
    expect(message(first)).toContain("posted after the statement");
    expect(message(first)).toContain("May 12, 2026");
  });

  it("does not assert an unconfirmed refund or copy another visit’s receipts", () => {
    const { first } = createBillSample();
    first.eob.patientResponsibilityCents = 10000;
    first.payments!.push({ id: "other", postedOn: "2026-05-09", amountCents: 17533, allocation: "other_visit" });
    const text = message(first);
    expect(text).toContain("possible $50.00 credit");
    expect(text).not.toContain("$175.33");
    first.sameVisit = false;
    expect(message(first)).toContain("itemized");
    expect(message(first)).not.toContain("$");
  });
});
