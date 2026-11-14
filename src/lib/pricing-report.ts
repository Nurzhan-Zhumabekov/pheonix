import { sampleDrafts, toBillInput, toCallRecord, toNextStatementInput } from "./bill-draft";
import { readSavedCases, type GuestCase } from "./bill-guest-case";

// Client-side navigation to Pricing should keep the open check, even before the user saves it.
// Only this tab remembers the draft. Persistent storage is written by the explicit Save action.
let openCase: GuestCase | null = null;
export function rememberOpenCheck(draft: GuestCase) {
  openCase = draft.checked ? draft : null;
}

/** Called in the browser by the Pricing CTA. */
export function pricingReport() {
  let guest = openCase;
  if (!guest) {
    try {
      const saved = readSavedCases(window.localStorage);
      guest = saved.visits[0]?.draft ?? saved.sample;
    } catch {
      // A visitor who has disabled storage can still try the sample.
    }
  }
  const source = guest ?? sampleDrafts();
  return {
    first: toBillInput(source.first),
    call: !guest || guest.callOpen ? toCallRecord(source.call) : null,
    next: !guest || guest.compared ? toNextStatementInput(source.next) : null,
    sample: guest?.sample ?? true,
  };
}
