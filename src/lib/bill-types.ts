/** USD amounts are integer cents. Empty fields are null. Dates are local YYYY-MM-DD. */
export type BillDate = string | null;

export interface BillEob {
  status: "final" | "pending" | "unknown";
  issuedOn: BillDate;
  patientResponsibilityCents: number | null;
}

export interface BillStatement {
  issuedOn: BillDate;
  balanceCents: number | null;
  scope: "visit" | "combined" | "minimum_due" | "unknown";
}

export interface BillPayment {
  /** Stable local ID for a receipt. Keep it when editing or rechecking. */
  id: string;
  amountCents: number | null;
  postedOn: BillDate;
  allocation: "this_visit" | "other_visit" | "unknown";
}

export interface BillInput {
  visitDate: BillDate;
  /** Did the patient confirm the same patient, provider and visit on the documents? */
  sameVisit: boolean | null;
  eob: BillEob;
  statement: BillStatement;
  /** [] means confirmed no payments. null means the history is unknown. */
  payments: BillPayment[] | null;
}

export interface CallRecord {
  calledOn: BillDate;
  promisedBalanceCents: number | null;
  followUpOn: BillDate;
}

export interface NextStatementInput {
  /** Confirmation that this statement belongs to the saved case. */
  sameVisit: boolean | null;
  statement: BillStatement;
  confirmedSameDayRevision?: boolean;
  /** Omit to reuse the original EOB. */
  eob?: BillEob;
  /** Omit to reuse receipts. If edited, pass the full ledger, including original receipts. */
  payments?: BillPayment[] | null;
}

export interface CallPreparation {
  action: "call_provider" | "call_insurer" | "check_portal" | "review_input" | "none";
  /** English text for the action card and for copying. */
  question: string;
}

export type BillStatus = "needs_info" | "above_expected" | "below_expected" | "matches" | "possible_credit";

export interface BillCheck {
  status: BillStatus;
  /** The following amounts are null when the documents cannot be reconciled. */
  expectedBalanceCents: number | null;
  /** Statement balance minus expected balance. A positive value is an amount to clarify. */
  differenceCents: number | null;
  postedCents: number | null;
  postedAfterStatementCents: number | null;
  possibleCreditCents: number | null;
  call: CallPreparation;
}

export interface FollowUpCheck {
  first: BillCheck;
  current: BillCheck;
  /** New minus original, for comparable statements only. */
  changes: {
    billedCents: number;
    responsibilityCents: number;
    postedCents: number;
    differenceCents: number;
  } | null;
  /** New statement minus the promise, when the payment and EOB basis is unchanged. */
  promiseDifferenceCents: number | null;
}
