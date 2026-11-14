import { checkBill, needsBillInfo } from "./bill-check";
import type {
  BillCheck, BillInput, BillPayment, CallPreparation, CallRecord, FollowUpCheck, NextStatementInput,
} from "./bill-types";
import { isIsoDate } from "./dates";

function requestDetails(
  first: BillCheck, action: CallPreparation["action"], question: string,
): FollowUpCheck {
  return { first, current: needsBillInfo(action, question), changes: null, promiseDifferenceCents: null };
}

/** Only receipts for this visit that could have appeared on this version of the statement. */
function postedReceipts(payments: BillPayment[], issuedOn: string) {
  const posted = new Map<string, BillPayment>();
  for (const payment of payments) {
    if (payment.allocation === "this_visit" && payment.postedOn && payment.postedOn <= issuedOn) {
      posted.set(payment.id, payment);
    }
  }
  return posted;
}

function samePostedReceipts(
  original: BillPayment[], originalDate: string, updated: BillPayment[], updatedDate: string,
): boolean {
  const before = postedReceipts(original, originalDate);
  const after = postedReceipts(updated, updatedDate);
  if (before.size !== after.size) return false;
  for (const [id, receipt] of before) {
    const match = after.get(id);
    if (!match || match.amountCents !== receipt.amountCents || match.postedOn !== receipt.postedOn) return false;
  }
  return true;
}

function promisedBalanceBeforeStatement(
  call: CallRecord | null | undefined, originalDate: string, nextDate: string,
): number | null {
  if (!call || !isIsoDate(call.calledOn)) return null;
  // A date alone cannot establish whether a statement issued on the call date reflects the call.
  if (call.calledOn < originalDate || call.calledOn >= nextDate) return null;
  const amount = call.promisedBalanceCents;
  return amount !== null && Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function compareNextStatement(
  original: BillInput, next: NextStatementInput, call?: CallRecord | null,
): FollowUpCheck {
  const first = checkBill(original);
  if (original.sameVisit !== true || next.sameVisit !== true) {
    return requestDetails(first, "call_provider", "Could you confirm both statements are for the same patient, provider and visit?");
  }

  const originalDate = original.statement.issuedOn;
  const nextDate = next.statement.issuedOn;
  if (!isIsoDate(originalDate) || !isIsoDate(nextDate) || nextDate < originalDate) {
    return requestDetails(first, "review_input", "Check the issue dates and enter the newer statement as the follow-up.");
  }
  if (nextDate === originalDate && next.confirmedSameDayRevision !== true) {
    return requestDetails(first, "review_input", "Both documents have the same issue date. Confirm which one is the revised statement.");
  }
  const eob = next.eob ?? original.eob;
  if (isIsoDate(eob.issuedOn) && isIsoDate(original.eob.issuedOn) && eob.issuedOn < original.eob.issuedOn) {
    return requestDetails(first, "review_input", "The replacement EOB predates the saved EOB. Check which one applies to the new statement.");
  }
  // An edited ledger replaces the saved list. Appending it would count saved receipts twice.
  const payments = next.payments === undefined ? original.payments : next.payments;
  if (next.payments && original.payments) {
    const ids = new Set(next.payments.map(payment => payment.id));
    if (original.payments.some(payment => !ids.has(payment.id))) {
      return requestDetails(first, "review_input", "Include the saved receipts when updating the payment list. Check the allocation of any corrected receipt.");
    }
  }

  const current = checkBill({ ...original, statement: next.statement, eob, payments });
  const result: FollowUpCheck = { first, current, changes: null, promiseDifferenceCents: null };
  const oldBalance = original.statement.balanceCents;
  const newBalance = next.statement.balanceCents;
  const oldShare = original.eob.patientResponsibilityCents;
  const newShare = eob.patientResponsibilityCents;
  if (
    oldBalance === null || newBalance === null || oldShare === null || newShare === null ||
    first.differenceCents === null || current.differenceCents === null ||
    first.postedCents === null || current.postedCents === null
  ) {
    return result;
  }
  const differenceChange = current.differenceCents - first.differenceCents;
  if (Number.isSafeInteger(differenceChange)) {
    result.changes = {
      billedCents: newBalance - oldBalance,
      responsibilityCents: newShare - oldShare,
      postedCents: current.postedCents - first.postedCents,
      differenceCents: differenceChange,
    };
  }

  // The promised balance is a separate reference. A later payment or EOB can legitimately change it.
  const promise = promisedBalanceBeforeStatement(call, originalDate, nextDate);
  if (promise === null || eob.issuedOn !== original.eob.issuedOn || newShare !== oldShare) return result;
  if (original.payments && payments && samePostedReceipts(original.payments, originalDate, payments, nextDate)) {
    result.promiseDifferenceCents = newBalance - promise;
  }
  return result;
}
