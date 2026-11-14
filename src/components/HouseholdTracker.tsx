import { toCallRecord } from "@/lib/bill-draft";
import type { GuestCase, SavedVisit } from "@/lib/bill-guest-case";
import { householdTotals, visitYear } from "@/lib/bill-household";
import { formatUsdCents } from "@/lib/bill-money";
import type { BillCheck, FollowUpCheck } from "@/lib/bill-types";
import { isIsoDate } from "@/lib/dates";
import { useState } from "react";
import styles from "./HouseholdTracker.module.css";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
function dateLabel(date: string): string {
  return isIsoDate(date) ? dateFormat.format(new Date(date + "T00:00:00Z")) : "Date pending";
}

function gapLabel(check: BillCheck | null): string {
  if (!check) return "Awaiting statement";
  if (check.status === "possible_credit" && check.possibleCreditCents !== null) {
    return `${formatUsdCents(check.possibleCreditCents)} possible credit`;
  }
  if (check.differenceCents === null) return "Needs more details";
  if (check.differenceCents === 0) return "Balances match";
  return check.differenceCents > 0
    ? `${formatUsdCents(check.differenceCents)} to clarify`
    : `${formatUsdCents(-check.differenceCents)} below expected`;
}

interface Props {
  visits: SavedVisit[];
  draft: GuestCase;
  currentId: string | null;
  savedDraft: GuestCase | null;
  check: BillCheck | null;
  comparison: FollowUpCheck | null;
  label: string;
  onLabel: (value: string) => void;
  onOpen: (visit: SavedVisit) => void;
  onDelete: (id: string) => void;
}

export function HouseholdTracker({ visits, draft, currentId, savedDraft, check, comparison, label, onLabel, onOpen, onDelete }: Props) {
  const [yearFilter, setYearFilter] = useState("all");
  const years = new Set(visits.map(visit => visitYear(visit.draft)));
  if (!draft.sample && draft.checked) years.add(visitYear(draft));
  const year = years.has(yearFilter) ? yearFilter : "all";
  const totals = householdTotals(visits, draft, currentId, year);
  const visible = visits.filter(visit => year === "all" || visitYear(visit.draft) === year);
  const showSampleTotal = draft.sample && !visits.length;
  const initialGap = check?.differenceCents;
  const savedCall = savedDraft?.callOpen ? toCallRecord(savedDraft.call) : null;
  const promise = savedCall?.promisedBalanceCents;
  const callText = promise == null ? "Call logged" : `Promised ${formatUsdCents(promise)}`;
  return (
    <section className={styles.panel} aria-label="Household tracker">
      <div className={styles.header}>
        <h2>Household tracker</h2>
        {Array.from(years).some(Boolean) && <label className={styles.period}>Visit year
          <select value={year} onChange={event => setYearFilter(event.target.value)}>
            <option value="all">All years</option>
            {Array.from(years).filter((value): value is string => value !== null).sort().reverse()
              .map(value => <option key={value}>{value}</option>)}
          </select>
        </label>}
      </div>
      <dl className={styles.totals}>
        {showSampleTotal
          ? <div><dt>Sample · Initial amount flagged</dt><dd>{initialGap == null ? "Awaiting details" : formatUsdCents(Math.max(0, initialGap))}</dd></div>
          : <>
            <div><dt>Initial amounts flagged</dt><dd>{totals.flaggedCents === null ? "Unavailable" : formatUsdCents(totals.flaggedCents)}</dd></div>
            <div><dt>Active visits</dt><dd>{totals.active}</dd></div>
            <div><dt>Resolved visits</dt><dd>{totals.resolved}</dd></div>
          </>}
      </dl>
      <p className={styles.hint}>Household totals include positive gaps on personal first statements. Sample visits are tracked separately.</p>
      {check && <div className={styles.timeline}>
        <h3>{draft.sample ? "Sample visit timeline" : "Current visit timeline"}</h3>
        <ol>
          <li><strong>Initial check</strong>{gapLabel(check)}</li>
          <li><strong>Billing contact</strong>{savedCall ? callText : "No call logged"}
            {savedCall?.followUpOn && isIsoDate(savedCall.followUpOn) && <span>Follow up {dateLabel(savedCall.followUpOn)}</span>}
          </li>
          <li><strong>Next statement</strong>{draft.resolved ? "Resolved" : gapLabel(comparison?.current ?? null)}</li>
        </ol>
      </div>}
      {!draft.sample && draft.checked && <label className={styles.nickname}>Visit nickname (optional)
        <input value={label} maxLength={64} onChange={event => onLabel(event.target.value)} placeholder="e.g. May clinic visit" />
      </label>}
      {visible.length > 0 && <details className={styles.visits}>
        <summary>Saved household visits ({visible.length})</summary>
        <ul>{visible.map(visit => {
          const name = visit.label || `Visit · ${dateLabel(visit.draft.first.visitDate)}`;
          return <li key={visit.id}>
            <div><strong>{name}</strong>
              <span>{visit.label && `${dateLabel(visit.draft.first.visitDate)} · `}{visit.draft.resolved ? "Resolved" : "Active"}</span>
            </div>
            <button type="button" aria-label={`Open ${name}`} onClick={() => onOpen(visit)}>Open</button>
            <button type="button" aria-label={`Delete ${name}`} onClick={() => onDelete(visit.id)}>Delete</button>
          </li>;
        })}</ul>
      </details>}
    </section>
  );
}
