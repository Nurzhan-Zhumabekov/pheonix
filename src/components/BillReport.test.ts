import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createBillSample } from "@/samples/bill-sample";
import { BillReport, type BillReportProps } from "./BillReport";

function reportText(props: BillReportProps) {
  return renderToStaticMarkup(createElement(BillReport, props)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

describe("BillReport", () => {
  it("prints the remaining discrepancy separately from the office's promise", () => {
    const { first, next, call } = createBillSample();
    call.promisedBalanceCents = 48099;
    const text = reportText({ first, next, call });
    expect(text).toContain("Promised balance $480.99");
    expect(text).toContain("Statement minus expected +$150.00 +$50.00");
    expect(text).toContain("Next statement minus promised balance · +$19.01");
  });

  it("uses edited receipts and the updated EOB when printing the next balance", () => {
    const { first, next, call } = createBillSample();
    next.eob = { status: "final", issuedOn: "2026-05-13", patientResponsibilityCents: 50937 };
    next.payments = [...first.payments!, {
      id: "second-receipt", amountCents: 2513, allocation: "this_visit", postedOn: "2026-05-14",
    }];
    next.statement.balanceCents = 34892;
    const text = reportText({ first, next, call });
    expect(text).toContain("$509.37"); // Updated EOB
    expect(text).toContain("$25.13");  // Second receipt
    expect(text).toContain("$334.24"); // Expected after both receipts
    expect(text).toContain("$14.68");  // Amount still to clarify
    expect(text).toContain("Next statement minus promised balance · Unavailable");
  });

  it("withholds comparisons when the next statement is for a different visit", () => {
    const { first, next, call } = createBillSample();
    next.sameVisit = false;
    next.statement.balanceCents = 50839;
    const text = reportText({ first, next, call });
    expect(text).toContain("More information needed");
    expect(text).toContain("Statement minus expected +$150.00 Unavailable");
    expect(text).not.toContain("$58.39");
  });

  it("can print the first statement before a call or follow-up exists", () => {
    const { first } = createBillSample();
    const text = reportText({ first });
    expect(text).toContain("$450.00");
    expect(text).toContain("$150.00");
    expect(text).not.toContain("Call record");
    expect(text).not.toContain("Next statement");
  });

  it("distinguishes a missing balance from a confirmed zero", () => {
    const { first } = createBillSample();
    first.payments = null;
    first.eob.patientResponsibilityCents = null;
    first.statement.balanceCents = null;
    const missing = reportText({ first });
    expect(missing).toContain("Amount on statement Not recorded");
    expect(missing).toContain("Expected visit balance Unavailable");
    expect(missing).not.toContain("$0.00");

    first.payments = [];
    first.eob.patientResponsibilityCents = 0;
    first.statement.balanceCents = 0;
    expect(reportText({ first })).toContain("Expected visit balance $0.00");
  });
});
