import type { ReactNode } from "react";
import { checkBill } from "@/lib/bill-check";
import { compareNextStatement } from "@/lib/bill-follow-up";
import { formatUsdCents } from "@/lib/bill-money";
import type { BillCheck, BillEob, BillInput, BillPayment, BillStatement, CallRecord, NextStatementInput } from "@/lib/bill-types";
import { isIsoDate } from "@/lib/dates";
import styles from "./BillReport.module.css";

export interface BillReportProps {
  first: BillInput;
  call?: CallRecord | null;
  next?: NextStatementInput | null;
  sample?: boolean;
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
});

function dateLabel(value: string | null) {
  if (value === null) return "Not recorded";
  return isIsoDate(value) ? dateFormat.format(new Date(value + "T00:00:00Z")) : "Check date";
}

function amount(value: number | null) {
  if (value === null) return "Not recorded";
  return Number.isSafeInteger(value) && value >= 0 ? formatUsdCents(value) : "Check amount";
}

function calculated(value: number | null, signed = false) {
  if (value === null) return "Unavailable";
  return (signed && value > 0 ? "+" : "") + formatUsdCents(value);
}

const scopeLabels: Record<BillStatement["scope"], string> = {
  visit: "Full visit balance", combined: "Combined balance", minimum_due: "Minimum due", unknown: "Unknown",
};
const eobLabels: Record<BillEob["status"], string> = { final: "Final", pending: "Pending", unknown: "Unknown" };
const statusLabels: Record<BillCheck["status"], string> = {
  matches: "Statement matches expected balance",
  above_expected: "Billed above expected balance",
  below_expected: "Billed below expected balance",
  possible_credit: "Possible credit to confirm",
  needs_info: "More information needed",
};
const actionLabels: Record<BillCheck["call"]["action"], string> = {
  call_provider: "Call the provider’s billing office",
  call_insurer: "Call your health plan",
  check_portal: "Check the provider portal",
  review_input: "Review the documents",
  none: "No follow-up question",
};

function ReceiptList({ payments, label }: { payments: BillInput["payments"]; label: string }) {
  if (!payments?.length) {
    return <p className={styles.note}><strong>{label}</strong> · {payments === null ? "Payment history unknown" : "Confirmed no payments"}</p>;
  }
  // Identical copies of one receipt appear once. Conflicting versions remain visible for review.
  const seen = new Set<string>();
  const unique = payments.filter(({ id, postedOn, allocation, amountCents }) => {
    const key = JSON.stringify([id, postedOn, allocation, amountCents]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const allocationLabels: Record<BillPayment["allocation"], string> = {
    this_visit: "This visit", other_visit: "Other visit", unknown: "Unconfirmed",
  };
  return (
    <table className={styles.receipts}>
      <caption>{label}</caption>
      <thead><tr><th scope="col">Posted on</th><th scope="col">Applied to</th><th scope="col">Amount</th></tr></thead>
      <tbody>{unique.map((payment, index) => (
        <tr key={index}>
          <td>{dateLabel(payment.postedOn)}</td>
          <td>{allocationLabels[payment.allocation]}</td>
          <td>{amount(payment.amountCents)}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

type StatementView = { statement: BillStatement; eob: BillEob; check: BillCheck };

export function BillReport({ first, call, next, sample = false }: BillReportProps) {
  const follow = next ? compareNextStatement(first, next, call) : null;
  const initial = follow?.first ?? checkBill(first);
  const latest = follow?.current ?? initial;
  const versions: StatementView[] = [{ statement: first.statement, eob: first.eob, check: initial }];
  if (next && follow) versions.push({ statement: next.statement, eob: next.eob ?? first.eob, check: follow.current });

  function row(label: string, value: (version: StatementView) => ReactNode, change?: number) {
    return (
      <tr>
        <th scope="row">{label}</th>
        {versions.map((version, index) => <td key={index}>{value(version)}</td>)}
        {follow?.changes && <td>{change === undefined ? "—" : calculated(change, true)}</td>}
      </tr>
    );
  }

  const changes = follow?.changes;
  const headlineAmount = latest.status === "possible_credit" ? latest.possibleCreditCents : latest.differenceCents;
  const originalQuestion = initial.call.question;
  return (
    <article className={styles.report} aria-label="BillShield US visit billing report">
      <header className={styles.header}>
        <p className={styles.brand}>BillShield US</p>
        {sample && <span className={styles.sample}>Sample data</span>}
      </header>
      <h1>Visit billing report</h1>
      <p className={styles.visit}>Date of service · {dateLabel(first.visitDate)}</p>

      <div className={styles.summary}>
        <div><span>{follow ? "Next statement" : "First statement"}</span><strong>{statusLabels[latest.status]}</strong></div>
        {headlineAmount !== null && <div className={styles.summaryAmount}>
          <span>{latest.status === "possible_credit" ? "Possible credit" : "Balance difference"}</span>
          <b>{formatUsdCents(Math.abs(headlineAmount))}</b>
        </div>}
      </div>

      <section>
        <h2>Statement review</h2>
        <table className={styles.comparison}>
          <thead><tr>
            <th scope="col">Source or calculation</th><th scope="col">First statement</th>
            {follow && <th scope="col">Next statement</th>}{changes && <th scope="col">Change</th>}
          </tr></thead>
          <tbody>
            {row("Statement issue date", v => dateLabel(v.statement.issuedOn))}
            {versions.some(v => v.statement.scope !== "visit") && row("Statement scope", v => scopeLabels[v.statement.scope])}
            {row("Explanation of benefits (EOB)", v => <>{eobLabels[v.eob.status]} · {dateLabel(v.eob.issuedOn)}</>)}
            {row("Patient share on EOB", v => amount(v.eob.patientResponsibilityCents), changes?.responsibilityCents)}
            {row("Payments posted by issue date", v => calculated(v.check.postedCents), changes?.postedCents)}
            {versions.some(v => (v.check.postedAfterStatementCents ?? 0) > 0) &&
              row("Payments posted after issue date", v => calculated(v.check.postedAfterStatementCents))}
            {row("Expected visit balance", v => calculated(v.check.expectedBalanceCents))}
            {row("Amount on statement", v => amount(v.statement.balanceCents), changes?.billedCents)}
            {row("Statement minus expected", v => calculated(v.check.differenceCents, true), changes?.differenceCents)}
            {versions.some(v => (v.check.possibleCreditCents ?? 0) > 0) &&
              row("Possible credit to confirm", v => calculated(v.check.possibleCreditCents))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Payment history</h2>
        <ReceiptList payments={first.payments} label={next?.payments === undefined ? "Receipts entered" : "First statement receipts"} />
        {next?.payments !== undefined && <ReceiptList payments={next.payments} label="Updated receipt list"/>}
      </section>

      {originalQuestion && <section className={styles.short}>
        <h2>First statement follow-up</h2>
        <p><strong>{actionLabels[initial.call.action]}.</strong> {originalQuestion}</p>
      </section>}

      {call && <section className={styles.short}>
        <h2>Call record</h2>
        <dl className={styles.call}>
          <div><dt>Called on</dt><dd>{dateLabel(call.calledOn)}</dd></div>
          <div><dt>Promised balance</dt><dd>{amount(call.promisedBalanceCents)}</dd></div>
          <div><dt>Follow up on</dt><dd>{dateLabel(call.followUpOn)}</dd></div>
        </dl>
        {follow && call.promisedBalanceCents !== null &&
          <p className={styles.note}>Next statement minus promised balance · <strong>{calculated(follow.promiseDifferenceCents, true)}</strong></p>}
      </section>}

      {follow?.current.call.question && <section className={styles.short}>
        <h2>Next statement follow-up</h2>
        <p><strong>{actionLabels[follow.current.call.action]}.</strong> {follow.current.call.question}</p>
      </section>}
    </article>
  );
}
