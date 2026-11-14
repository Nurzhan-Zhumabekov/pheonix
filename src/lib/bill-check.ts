import { formatUsdCents } from "./bill-money";
import type { BillCheck, BillInput, BillPayment, CallPreparation } from "./bill-types";
import { formatDay, isIsoDate } from "./dates";

export function needsBillInfo(action: CallPreparation["action"], question: string): BillCheck {
  return {
    status: "needs_info",
    expectedBalanceCents: null,
    differenceCents: null,
    postedCents: null,
    postedAfterStatementCents: null,
    possibleCreditCents: null,
    call: { action, question },
  };
}

function validAmount(cents: number | null): cents is number {
  return cents !== null && Number.isSafeInteger(cents) && cents >= 0;
}

type PaymentTotals = { posted: number; later: number; firstLaterDate: string | null };

function sumReceipts(payments: BillPayment[], statementDate: string): PaymentTotals | BillCheck {
  const seen = new Map<string, BillPayment>();
  const totals: PaymentTotals = { posted: 0, later: 0, firstLaterDate: null };
  for (const receipt of payments) {
    if (!receipt.id?.trim()) {
      return needsBillInfo("review_input", "Give each receipt its own entry so it can be counted once.");
    }
    const previous = seen.get(receipt.id);
    if (previous) {
      if (previous.postedOn !== receipt.postedOn || previous.amountCents !== receipt.amountCents ||
          previous.allocation !== receipt.allocation) {
        return needsBillInfo("review_input", "Two entries for the same receipt disagree. Check its date, amount and visit.");
      }
      continue;
    }
    seen.set(receipt.id, receipt);
    if (receipt.allocation === "other_visit") continue;
    if (receipt.allocation !== "this_visit" || !isIsoDate(receipt.postedOn)) {
      return needsBillInfo("call_provider", "Could you confirm which visit this payment was applied to and when it posted?");
    }
    if (!validAmount(receipt.amountCents)) {
      return needsBillInfo("review_input", "Check the amount on the receipt for this visit.");
    }
    if (receipt.postedOn <= statementDate) {
      totals.posted += receipt.amountCents;
    } else {
      totals.later += receipt.amountCents;
      if (receipt.amountCents > 0 && (!totals.firstLaterDate || receipt.postedOn < totals.firstLaterDate)) {
        totals.firstLaterDate = receipt.postedOn;
      }
    }
  }
  if (!Number.isSafeInteger(totals.posted) || !Number.isSafeInteger(totals.later)) {
    return needsBillInfo("review_input", "Check the payment amounts. The total is too large to reconcile.");
  }
  return totals;
}

export function checkBill(input: BillInput): BillCheck {
  const { eob, statement, payments, visitDate } = input;
  if (input.sameVisit !== true || statement.scope !== "visit") {
    return needsBillInfo("call_provider", "Could you send the full balance and payment history for this patient, provider and visit?");
  }
  if (eob.status !== "final") {
    return needsBillInfo("call_insurer", "Has this claim been processed? Where can I find my final EOB and patient responsibility?");
  }
  if (!isIsoDate(visitDate) || !isIsoDate(statement.issuedOn) || !isIsoDate(eob.issuedOn)) {
    return needsBillInfo("review_input", "Enter the visit date and the issue dates printed on the EOB and statement.");
  }
  if (statement.issuedOn < visitDate || eob.issuedOn < visitDate) {
    return needsBillInfo("review_input", "Check the visit date. A document appears to have been issued before this visit.");
  }
  if (eob.issuedOn > statement.issuedOn) {
    return needsBillInfo("call_provider", "My EOB was issued after this statement. Could you send the balance based on the updated EOB?");
  }
  if (!validAmount(statement.balanceCents) || !validAmount(eob.patientResponsibilityCents)) {
    return needsBillInfo("review_input", "Enter the full balance for this visit and the patient responsibility shown on your final EOB.");
  }
  if (!Array.isArray(payments)) {
    return needsBillInfo("call_provider", "Could you confirm which payments, if any, were posted to this visit?");
  }
  const totals = sumReceipts(payments, statement.issuedOn);
  if ("status" in totals) return totals;

  const net = eob.patientResponsibilityCents - totals.posted;
  const expectedBalanceCents = Math.max(0, net);
  const differenceCents = statement.balanceCents - expectedBalanceCents;
  const possibleCreditCents = Math.max(0, -net);
  const result: BillCheck = {
    status: "matches",
    expectedBalanceCents, differenceCents, possibleCreditCents,
    postedCents: totals.posted, postedAfterStatementCents: totals.later,
    call: { action: "none", question: "" },
  };

  const visit = formatDay(visitDate);
  const issued = formatDay(statement.issuedOn);
  const balance = formatUsdCents(statement.balanceCents);
  const paid = formatUsdCents(totals.posted);
  if (possibleCreditCents > 0) {
    result.status = "possible_credit";
    result.call = {
      action: "call_provider",
      question: `My receipts for the ${visit} visit total ${paid} through ${issued}. My EOB lists ${formatUsdCents(eob.patientResponsibilityCents)} as my share. Could you confirm whether my account has a credit?`,
    };
  } else if (differenceCents > 0) {
    result.status = "above_expected";
    const payment = totals.posted > 0 ? ` My payments posted by that date total ${paid}.` : "";
    const request = totals.posted > 0
      ? "Could you check where those payments were applied and send the updated balance in writing?"
      : "Could you explain the additional amount and send the balance for this visit in writing?";
    result.call = {
      action: "call_provider",
      question: `My statement dated ${issued} shows ${balance} for my ${visit} visit.${payment} Based on my EOB and receipts I expected ${formatUsdCents(expectedBalanceCents)}, a difference of ${formatUsdCents(differenceCents)}. ${request}`,
    };
  } else if (differenceCents < 0) {
    result.status = "below_expected";
    result.call = {
      action: "call_provider",
      question: `My ${issued} statement shows ${balance} for my ${visit} visit. Based on my EOB and receipts I expected ${formatUsdCents(expectedBalanceCents)}. Could you confirm which adjustments are included?`,
    };
  }
  if (totals.firstLaterDate) {
    const laterNote = `${formatUsdCents(totals.later)} posted after the ${issued} statement, starting on ${formatDay(totals.firstLaterDate)}.`;
    if (result.status === "matches") {
      result.call = { action: "check_portal", question: `${laterNote} Check the current visit balance in the provider portal.` };
    } else {
      result.call.question += ` ${laterNote}`;
    }
  }
  return result;
}
