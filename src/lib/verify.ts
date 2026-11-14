import type { Checked, Plan, RawPlan } from "./schema";

/**
 * Checks every quote the model returned against the document text.
 * Items whose quote cannot be found are kept and flagged, never silently dropped:
 * a missing medicine is worse than a flagged one.
 */

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteIsInDocument(quote: string, normalizedDocument: string): boolean {
  const q = normalize(quote);
  return q.length >= 3 && normalizedDocument.includes(q);
}

export function verifyPlan(raw: RawPlan, documentText: string): Plan {
  const doc = normalize(documentText);
  const check = <T extends { source_quote: string }>(item: T): Checked<T> => ({
    ...item,
    verified: quoteIsInDocument(item.source_quote, doc),
  });
  return {
    ...raw,
    medications: raw.medications.map(check),
    appointments: raw.appointments.map(check),
    restrictions: raw.restrictions.map(check),
    warning_signs: raw.warning_signs.map(check),
  };
}

export function countUnverified(plan: Plan): number {
  return [
    ...plan.medications,
    ...plan.appointments,
    ...plan.restrictions,
    ...plan.warning_signs,
  ].filter((item) => !item.verified).length;
}
