import type { BillInput, CallRecord, NextStatementInput } from "@/lib/bill-types";

export const demoScenarios = [
  { id: "copay", label: "Unapplied $150 copay" },
  { id: "late-payment", label: "Payment posted after statement" },
  { id: "credit", label: "Possible $50 credit" },
  { id: "pending", label: "Pending EOB" },
] as const;

export type DemoScenario = (typeof demoScenarios)[number]["id"];

/** Fictional, editable US-dollar example. Create a fresh case for each demo or reset. */
export function createBillSample(scenario: DemoScenario = "copay"): {
  first: BillInput;
  call: CallRecord;
  next: NextStatementInput;
} {
  const first: BillInput = {
    visitDate: "2026-05-05",
    sameVisit: true,
    eob: { status: "final", issuedOn: "2026-05-08", patientResponsibilityCents: 60000 },
    statement: { scope: "visit", issuedOn: "2026-05-10", balanceCents: 60000 },
    payments: [{
      id: "receipt-1", allocation: "this_visit", amountCents: 15000,
      postedOn: scenario === "late-payment" ? "2026-05-12" : "2026-05-06",
    }],
  };
  const next: NextStatementInput = {
    sameVisit: true,
    statement: { scope: "visit", issuedOn: "2026-05-16", balanceCents: 50000 },
  };
  const call: CallRecord = { calledOn: null, promisedBalanceCents: null, followUpOn: null };
  switch (scenario) {
    case "copay":
      return {
        first, next,
        call: { calledOn: "2026-05-11", promisedBalanceCents: 45000, followUpOn: "2026-05-15" },
      };
    case "late-payment":
      next.statement.balanceCents = 45000;
      break;
    case "credit":
      first.eob.patientResponsibilityCents = 15000;
      first.statement.balanceCents = 0;
      next.eob = { status: "final", issuedOn: "2026-05-14", patientResponsibilityCents: 10000 };
      next.statement.balanceCents = 0;
      break;
    case "pending":
      first.eob = { status: "pending", issuedOn: null, patientResponsibilityCents: null };
      next.statement.balanceCents = null;
      break;
  }
  return { first, call, next };
}
