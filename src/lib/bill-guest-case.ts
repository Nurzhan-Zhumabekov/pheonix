import { z } from "zod";
import type { CallRecord, FollowUpCheck } from "./bill-types";
import { isIsoDate } from "./dates";

const draftFields = {
  sameVisit: z.boolean(),
  eobStatus: z.enum(["final", "pending", "unknown"]),
  eobDate: z.string(),
  responsibility: z.string(),
  statementScope: z.enum(["visit", "combined", "minimum_due", "unknown"]),
  statementDate: z.string(),
  balance: z.string(),
  paymentsKnown: z.boolean(),
  payments: z.array(z.object({
    id: z.string(), amount: z.string(), postedOn: z.string(),
    allocation: z.enum(["this_visit", "other_visit", "unknown"]),
  })),
};

const caseSchema = z.object({
  first: z.object({ ...draftFields, visitDate: z.string() }),
  call: z.object({ calledOn: z.string(), promisedBalance: z.string(), followUpOn: z.string() }),
  next: z.object({
    ...draftFields, sameDayRevision: z.boolean(), editEob: z.boolean(), editPayments: z.boolean(),
  }),
  sample: z.boolean(), checked: z.boolean(), callOpen: z.boolean(),
  nextOpen: z.boolean(), compared: z.boolean(), resolved: z.boolean(),
});

export type GuestCase = z.infer<typeof caseSchema>;
export type SavedVisit = { id: string; label: string; updatedAt: number; draft: GuestCase };
export type SavedCases = { visits: SavedVisit[]; sample: GuestCase | null };
type CaseStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
const legacyKey = "billshield:guest-case:v1";
const keys = { personal: "billshield:personal-case:v1", sample: "billshield:sample-case:v1" };
const visitPrefix = "billshield:visit:v2:";
const previousVisitId = "previous-visit";
const storedVisit = z.object({ label: z.string(), updatedAt: z.number().finite(), draft: caseSchema });

function readCase(storage: CaseStorage, key: string): GuestCase | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = caseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function readSavedCases(storage: CaseStorage): SavedCases {
  const legacy = readCase(storage, legacyKey);
  const own = readCase(storage, keys.personal);
  const demo = readCase(storage, keys.sample);
  const visits: SavedVisit[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(visitPrefix)) continue;
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try {
      const value = storedVisit.safeParse(JSON.parse(raw));
      if (value.success && !value.data.draft.sample) {
        visits.push({ id: key.slice(visitPrefix.length), ...value.data });
      }
    } catch {
      // An unreadable entry must not prevent the user from resuming other visits.
    }
  }
  const oldPersonal = own?.sample === false ? own : legacy?.sample === false ? legacy : null;
  if (oldPersonal && !visits.some(visit => visit.id === previousVisitId)) {
    visits.push({ id: previousVisitId, label: "", updatedAt: 0, draft: oldPersonal });
  }
  return {
    visits: visits.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id)),
    sample: demo?.sample === true ? demo : legacy?.sample === true ? legacy : null,
  };
}

/** A key per visit lets tabs save different visits without overwriting a shared list. */
export function writeSavedCase(storage: CaseStorage, current: GuestCase, id: string, label = "") {
  if (current.sample) {
    storage.setItem(keys.sample, JSON.stringify(current));
    if (readCase(storage, legacyKey)?.sample === true) storage.removeItem(legacyKey);
    return;
  }
  storage.setItem(visitPrefix + id, JSON.stringify({ label: label.trim(), updatedAt: Date.now(), draft: current }));
  if (id === previousVisitId) removeOldPersonal(storage);
}

function removeOldPersonal(storage: CaseStorage) {
  storage.removeItem(keys.personal);
  if (readCase(storage, legacyKey)?.sample === false) storage.removeItem(legacyKey);
}

export function clearSavedCase(storage: CaseStorage, sample: boolean, id: string | null) {
  if (sample) {
    storage.removeItem(keys.sample);
    if (readCase(storage, legacyKey)?.sample === true) storage.removeItem(legacyKey);
  } else if (id !== null) {
    if (id === previousVisitId) removeOldPersonal(storage);
    storage.removeItem(visitPrefix + id);
  }
}

/** A new EOB or receipt may change the basis of a promise. A bill from before the call cannot confirm it. */
export function resolutionState(comparison: FollowUpCheck | null, call: CallRecord | null,
  firstDate: string | null, nextDate: string | null) {
  if (comparison?.current.status !== "matches" || comparison.current.call.action !== "none") return "open";
  if (call?.promisedBalanceCents == null) return "ready";
  if (!isIsoDate(call.calledOn) || !isIsoDate(firstDate) || call.calledOn < firstDate) return "check_call_date";
  if (!isIsoDate(nextDate) || call.calledOn >= nextDate) return "await_later_statement";
  return comparison.promiseDifferenceCents === null || comparison.promiseDifferenceCents === 0 ? "ready" : "open";
}
