import type { BillInput, CallRecord, NextStatementInput } from "@/lib/bill-types";

/** Fictional, editable US-dollar example. Create a fresh case for each demo or reset. */
export function createBillSample(): {
  first: BillInput;
  call: CallRecord;
  next: NextStatementInput;
} {
  return {
    first: {
      visitDate: "2026-05-05",
      sameVisit: true,
      eob: { status: "final", issuedOn: "2026-05-08", patientResponsibilityCents: 60000 },
      statement: { scope: "visit", issuedOn: "2026-05-10", balanceCents: 60000 },
      payments: [{ id: "receipt-1", allocation: "this_visit", postedOn: "2026-05-06", amountCents: 15000 }],
    },
    call: { calledOn: "2026-05-11", promisedBalanceCents: 45000, followUpOn: "2026-05-15" },
    next: {
      sameVisit: true,
      statement: { scope: "visit", issuedOn: "2026-05-16", balanceCents: 50000 },
    },
  };
}
