import { formatUsdCents } from "./bill-money";
import type { BillCheck, BillInput } from "./bill-types";
import { isIsoDate } from "./dates";

const writtenDate = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});

function dated(value: string | null, prefix: string): string {
  return isIsoDate(value) ? prefix + writtenDate.format(new Date(value + "T00:00:00Z")) : "";
}

function knownAmount(cents: number | null): cents is number {
  return cents !== null && Number.isSafeInteger(cents) && cents >= 0;
}

/** A message the patient can review and paste into the appropriate portal. */
export function buildPortalMessage(input: BillInput, check: BillCheck): string {
  const visit = "my visit" + dated(input.visitDate, " on ");
  if (check.call.action === "call_insurer") {
    return `Hello Member Services,\n\nI’m following up on the claim for ${visit}. Could you confirm its status and tell me when and where I can find the final explanation of benefits showing my share?\n\nThank you.`;
  }
  const lines = ["Hello Billing Team,", "", `I’m checking the balance for ${visit}.`];
  if (input.sameVisit !== true || input.statement.scope !== "visit") {
    lines.push("Could you send an itemized statement showing just this visit, its remaining balance and the payments applied to it?");
  } else if (check.call.action === "review_input") {
    lines.push("Could you send me the dated statement and payment ledger for this visit so I can verify my records?");
  } else {
    if (knownAmount(input.statement.balanceCents)) {
      lines.push(`The clinic statement${dated(input.statement.issuedOn, " dated ")} shows ${formatUsdCents(input.statement.balanceCents)}.`);
    }
    if (input.eob.status === "final" && knownAmount(input.eob.patientResponsibilityCents)) {
      lines.push(`My final EOB${dated(input.eob.issuedOn, " dated ")} lists ${formatUsdCents(input.eob.patientResponsibilityCents)} as my responsibility.`);
    }

    const seen = new Set<string>();
    for (const receipt of input.payments ?? []) {
      if (seen.has(receipt.id) || receipt.allocation !== "this_visit" || !knownAmount(receipt.amountCents)) continue;
      seen.add(receipt.id);
      lines.push(`I have a receipt for ${formatUsdCents(receipt.amountCents)}${dated(receipt.postedOn, ", posted on ")}.`);
    }

    lines.push("");
    if (check.status === "needs_info") {
      lines.push(check.call.question);
    } else if (check.status === "possible_credit" && knownAmount(check.possibleCreditCents)) {
      lines.push(`Could you confirm whether the possible ${formatUsdCents(check.possibleCreditCents)} credit is on my account and explain the next step in writing?`);
    } else if ((check.status === "above_expected" || check.status === "below_expected") && knownAmount(check.expectedBalanceCents)) {
      lines.push(`I expected a balance of ${formatUsdCents(check.expectedBalanceCents)} on the statement date. Could you review the payments and adjustments and send me the remaining balance in writing?`);
    } else if (check.call.action === "check_portal") {
      lines.push("A payment posted after the statement was issued. Could you confirm the updated balance that includes it?");
    } else {
      lines.push("Could you confirm the current balance in writing and whether all payments have posted?");
    }
  }
  return [...lines, "", "Thank you."].join("\n");
}
