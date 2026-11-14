import { checkBill } from "./bill-check";
import { toBillInput } from "./bill-draft";
import type { GuestCase, SavedVisit } from "./bill-guest-case";
import { isIsoDate } from "./dates";

export function visitYear(draft: GuestCase): string | null {
  return isIsoDate(draft.first.visitDate) ? draft.first.visitDate.slice(0, 4) : null;
}

/** Replace the stored copy of the open visit with its edits; count its first statement exactly once. */
export function householdTotals(visits: SavedVisit[], current: GuestCase, currentId: string | null, year: string) {
  const cases = visits.filter(visit => !visit.draft.sample && (current.sample || visit.id !== currentId))
    .map(visit => visit.draft);
  if (!current.sample && current.checked) cases.push(current);

  let active = 0;
  let resolved = 0;
  let flagged = 0;
  for (const draft of cases) {
    if (year !== "all" && visitYear(draft) !== year) continue;
    if (draft.resolved) resolved++;
    else active++;
    if (draft.checked) {
      const check = checkBill(toBillInput(draft.first));
      if (check.differenceCents !== null && check.differenceCents > 0) flagged += check.differenceCents;
    }
  }
  return { active, resolved, flaggedCents: Number.isSafeInteger(flagged) ? flagged : null };
}
