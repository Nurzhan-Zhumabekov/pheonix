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
export type SavedCases = { personal: GuestCase | null; sample: GuestCase | null };
type CaseStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const legacyKey = "billshield:guest-case:v1";
const keys = { personal: "billshield:personal-case:v1", sample: "billshield:sample-case:v1" };

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
  return {
    personal: own?.sample === false ? own : legacy?.sample === false ? legacy : null,
    sample: demo?.sample === true ? demo : legacy?.sample === true ? legacy : null,
  };
}

export function writeSavedCase(storage: CaseStorage, current: GuestCase) {
  storage.setItem(keys[current.sample ? "sample" : "personal"], JSON.stringify(current));
  if (readCase(storage, legacyKey)?.sample === current.sample) storage.removeItem(legacyKey);
}

export function clearSavedCase(storage: CaseStorage, sample: boolean) {
  storage.removeItem(keys[sample ? "sample" : "personal"]);
  if (readCase(storage, legacyKey)?.sample === sample) storage.removeItem(legacyKey);
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
