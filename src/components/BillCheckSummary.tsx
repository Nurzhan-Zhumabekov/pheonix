import { formatUsdCents } from "@/lib/bill-money";
import type { BillCheck, BillInput, FollowUpCheck } from "@/lib/bill-types";
import { formatDay, isIsoDate } from "@/lib/dates";
import styles from "./BillCheckSummary.module.css";

const statusLabels: Record<BillCheck["status"], string> = {
  above_expected: "Amount to clarify",
  below_expected: "Below the expected balance",
  matches: "Matches the expected balance",
  needs_info: "More information needed",
  possible_credit: "Possible credit to confirm",
};

function amount(cents: number | null): string {
  return cents === null ? "Unavailable" : formatUsdCents(cents);
}

function signedAmount(cents: number): string {
  return (cents > 0 ? "+" : "") + formatUsdCents(cents);
}

function differenceLabel(check: BillCheck): string {
  if (check.differenceCents === null) return "Unavailable";
  return signedAmount(check.differenceCents);
}

export function BillCheckSummary({
  input,
  check,
  title = "Statement comparison",
}: {
  input: BillInput;
  check: BillCheck;
  title?: string;
}) {
  const statementDate = input.statement.issuedOn;
  const amountsAvailable = check.expectedBalanceCents !== null;
  const headline = check.status === "possible_credit" ? check.possibleCreditCents : check.differenceCents;

  return (
    <section className={styles.card} aria-label={title}>
      <header className={styles.cardHeader}>
        <h2>{title}</h2>
        {isIsoDate(statementDate) && <time dateTime={statementDate}>{formatDay(statementDate)}</time>}
      </header>

      <div className={styles.status} data-status={check.status} role="status">
        <strong>{statusLabels[check.status]}</strong>
        {headline !== null && <b>{formatUsdCents(Math.abs(headline))}</b>}
      </div>

      {amountsAvailable ? (
        <dl className={styles.amounts}>
          <div><dt>Your share on the EOB</dt><dd>{amount(input.eob.patientResponsibilityCents)}</dd></div>
          <div><dt>Payments posted by the statement date</dt><dd>{amount(check.postedCents)}</dd></div>
          <div><dt>Expected visit balance</dt><dd>{amount(check.expectedBalanceCents)}</dd></div>
          <div><dt>Balance on the statement</dt><dd>{amount(input.statement.balanceCents)}</dd></div>
          {check.status === "possible_credit" && (
            <div><dt>Statement minus expected balance</dt><dd>{differenceLabel(check)}</dd></div>
          )}
        </dl>
      ) : (
        <p className={styles.note}>Review the document and payment details to compare balances for this visit.</p>
      )}
      {(check.postedAfterStatementCents ?? 0) > 0 && (
        <p className={styles.note}>
          <strong>{amount(check.postedAfterStatementCents)}</strong> posted after the statement date.
          The comparison above uses payments posted by that date.
        </p>
      )}
    </section>
  );
}

export function BillComparisonSummary({ comparison }: { comparison: FollowUpCheck }) {
  const { first, current, changes, promiseDifferenceCents } = comparison;
  const changedAmounts = changes
    ? [
      { label: "Statement balance", cents: changes.billedCents },
      { label: "Your share on the EOB", cents: changes.responsibilityCents },
      { label: "Payments posted by the statement date", cents: changes.postedCents },
    ].filter(({ cents }) => cents !== 0)
    : [];

  return (
    <section className={styles.card} aria-label="Changes between statements">
      <header className={styles.cardHeader}><h2>What changed</h2></header>
      {changes ? (
        <>
          <dl className={styles.versions} aria-label="Statement minus expected balance">
            <div><dt>First statement difference</dt><dd>{differenceLabel(first)}</dd></div>
            <div><dt>New statement difference</dt><dd>{differenceLabel(current)}</dd></div>
          </dl>
          {changedAmounts.length > 0 && (
            <dl className={styles.amounts} aria-label="Changes from the first statement">
              {changedAmounts.map(({ label, cents }) => (
                <div key={label}><dt>{label}</dt><dd>{signedAmount(cents)}</dd></div>
              ))}
            </dl>
          )}
          {promiseDifferenceCents !== null && (
            <dl className={styles.promise}>
              <div>
                <dt>{promiseDifferenceCents === 0 ? "Matches the promised balance" : "New balance minus promised balance"}</dt>
                <dd>{signedAmount(promiseDifferenceCents)}</dd>
              </div>
            </dl>
          )}
        </>
      ) : (
        <p className={styles.note}>A comparison is available when both statements have enough information for a balance check.</p>
      )}
    </section>
  );
}
