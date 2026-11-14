"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { checkBill } from "@/lib/bill-check";
import { compareNextStatement } from "@/lib/bill-follow-up";
import {
  clearSavedCase, readSavedCases, resolutionState, writeSavedCase,
  type GuestCase, type SavedCases, type SavedVisit,
} from "@/lib/bill-guest-case";
import {
  emptyBillDraft, emptyCallDraft, emptyNextDraft, sampleDrafts,
  toBillInput, toCallRecord, toNextStatementInput,
  type BillDraft, type CallDraft, type NextDraft, type PaymentDraft,
} from "@/lib/bill-draft";
import { BillCallGuidance, FollowUpReminder } from "./BillCallGuidance";
import { BillCheckSummary, BillComparisonSummary } from "./BillCheckSummary";
import { QuickDemoScenarios, SmartPaste } from "./BillInputTools";
import type { DemoScenario } from "@/samples/bill-sample";
import { HouseholdTracker } from "./HouseholdTracker";
import { PrintableBillReport } from "./PrintableBillReport";
import { DemoReportCheckout } from "./DemoReportCheckout";
import { rememberOpenCheck } from "@/lib/pricing-report";
import styles from "./TryFlow.module.css";

function newCase(sample: boolean, scenario?: DemoScenario): GuestCase {
  const showFollowUp = scenario === "credit" || scenario === "copay";
  return {
    ...(sample ? sampleDrafts(scenario) : { first: emptyBillDraft(), call: emptyCallDraft(), next: emptyNextDraft() }),
    sample, checked: sample, callOpen: scenario !== undefined && scenario !== "credit",
    nextOpen: showFollowUp, compared: showFollowUp, resolved: false,
  };
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function MoneyField({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (value: string) => void; hint?: string;
}) {
  return (
    <FormField label={label} hint={hint}>
      <span className={styles.money}>
        <span aria-hidden="true">$</span>
        <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)}
          placeholder="0.00" maxLength={24} />
      </span>
    </FormField>
  );
}

function DateField({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  return (
    <FormField label={label}>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}

function EobFields({ status, date, amount, onStatus, onDate, onAmount }: {
  status: BillDraft["eobStatus"]; date: string; amount: string;
  onStatus: (value: BillDraft["eobStatus"]) => void; onDate: (value: string) => void;
  onAmount: (value: string) => void;
}) {
  return (
    <div className={styles.fieldGrid}>
      <FormField label="EOB status">
        <select value={status} onChange={(event) => onStatus(event.target.value as BillDraft["eobStatus"])}>
          <option value="unknown">I’m not sure</option>
          <option value="final">Processed / final</option>
          <option value="pending">Still processing</option>
        </select>
      </FormField>
      <DateField label="EOB issue date" value={date} onChange={onDate} />
      <MoneyField label="Patient responsibility" hint="Look for “What you owe” or “Patient balance.”"
        value={amount} onChange={onAmount} />
    </div>
  );
}

function StatementFields({ scope, date, amount, onScope, onDate, onAmount }: {
  scope: BillDraft["statementScope"]; date: string; amount: string;
  onScope: (value: BillDraft["statementScope"]) => void; onDate: (value: string) => void;
  onAmount: (value: string) => void;
}) {
  return (
    <div className={styles.fieldGrid}>
      <FormField label="What does this balance cover?">
        <select value={scope} onChange={(event) => onScope(event.target.value as BillDraft["statementScope"])}>
          <option value="unknown">I’m not sure</option>
          <option value="visit">Full balance for this visit</option>
          <option value="combined">Multiple visits or people</option>
          <option value="minimum_due">Minimum payment only</option>
        </select>
      </FormField>
      <DateField label="Statement issue date" value={date} onChange={onDate} />
      <MoneyField label="Current balance due" hint="Use the clinic statement’s remaining balance for this visit."
        value={amount} onChange={onAmount} />
    </div>
  );
}

function PaymentFields({ known, payments, onKnown, onPayments, keep, allowUnknown = true }: {
  known: boolean; payments: PaymentDraft[]; onKnown: (value: boolean) => void;
  onPayments: (value: PaymentDraft[]) => void; keep?: ReadonlySet<string>; allowUnknown?: boolean;
}) {
  function update(id: string, patch: Partial<PaymentDraft>) {
    onPayments(payments.map((payment) => payment.id === id ? { ...payment, ...patch } : payment));
  }
  return (
    <div>
      {allowUnknown && (
        <label className={styles.check}>
          <input type="checkbox" checked={known} onChange={(event) => onKnown(event.target.checked)} />
          <span>I know which payments I made, including if I made none.</span>
        </label>
      )}
      {(known || payments.length > 0) && (
        <>
          {payments.length === 0 && <p className={styles.hint}>No payments entered. Add each receipt you want to check.</p>}
          {payments.map((receipt, index) => (
            <fieldset className={styles.receipt} key={receipt.id}>
              <legend>Payment {index + 1}</legend>
              <div className={styles.fieldGrid}>
                <MoneyField label="Amount paid" value={receipt.amount}
                  onChange={(amount) => update(receipt.id, { amount })} />
                <DateField label="Date posted" value={receipt.postedOn}
                  onChange={(postedOn) => update(receipt.id, { postedOn })} />
                <FormField label="Applied to">
                  <select value={receipt.allocation} onChange={(event) => update(receipt.id, {
                    allocation: event.target.value as PaymentDraft["allocation"],
                  })}>
                    <option value="this_visit">This visit</option>
                    <option value="other_visit">A different visit</option>
                    <option value="unknown">I’m not sure</option>
                  </select>
                </FormField>
              </div>
              {!keep?.has(receipt.id) && (
                <button type="button" className={styles.textButton}
                  aria-label={"Remove payment " + (index + 1)}
                  onClick={() => onPayments(payments.filter((item) => item.id !== receipt.id))}>
                  Remove payment
                </button>
              )}
            </fieldset>
          ))}
          {known && <button type="button" className={styles.secondary} onClick={() => onPayments([
            ...payments, { id: crypto.randomUUID(), amount: "", postedOn: "", allocation: "this_visit" },
          ])}>Add payment</button>}
        </>
      )}
    </div>
  );
}

function StepTitle({ number, title }: { number: string; title: string }) {
  return <h2 className={styles.stepTitle}><span aria-hidden="true">{number}</span>{title}</h2>;
}

export function TryFlow({ startWithSample = false }: { startWithSample?: boolean }) {
  const [draft, setDraft] = useState(() => newCase(startWithSample));
  const [formVersion, setFormVersion] = useState(0);
  const [saved, setSaved] = useState<SavedCases>({ visits: [], sample: null });
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [visitLabel, setVisitLabel] = useState("");
  const latestVisit = saved.visits[0];
  const resumeCase = latestVisit?.draft ?? saved.sample;
  const activeSave = draft.sample ? (activeCaseId === "sample" ? saved.sample : null)
    : saved.visits.find(visit => visit.id === activeCaseId)?.draft ?? null;
  const [storageMessage, setStorageMessage] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const reportRef = useRef<HTMLElement>(null);

  useEffect(() => { rememberOpenCheck(draft); }, [draft]);

  useEffect(() => {
    function refreshSaved() {
      try {
        setSaved(readSavedCases(window.localStorage));
      } catch {
        setStorageMessage("This browser could not open the saved case. You can still check a statement.");
      }
    }
    refreshSaved();
    window.addEventListener("storage", refreshSaved);
    return () => window.removeEventListener("storage", refreshSaved);
  }, []);

  useEffect(() => {
    if (showPaywall) reportRef.current?.focus();
  }, [showPaywall, unlocked]);

  const first = toBillInput(draft.first);
  const call = toCallRecord(draft.call);
  const next = toNextStatementInput(draft.next);
  const check = draft.checked ? checkBill(first) : null;
  const comparison = draft.compared ? compareNextStatement(first, next, call) : null;
  const nextBill = {
    ...first, sameVisit: next.sameVisit, statement: next.statement,
    eob: next.eob ?? first.eob, payments: next.payments === undefined ? first.payments : next.payments,
  };
  const resolution = resolutionState(comparison, call, first.statement.issuedOn, next.statement.issuedOn);

  function updateFirst(patch: Partial<BillDraft>) {
    setDraft((current) => ({
      ...current, resolved: false,
      first: { ...current.first, ...patch },
    }));
  }
  function updateCall(patch: Partial<CallDraft>) {
    setDraft((current) => ({ ...current, resolved: false, call: { ...current.call, ...patch } }));
  }
  function updateNext(patch: Partial<NextDraft>) {
    setDraft((current) => ({ ...current, resolved: false, next: { ...current.next, ...patch } }));
  }
  function loadCase(nextCase: GuestCase, visit?: SavedVisit | "sample") {
    setFormVersion(version => version + 1);
    setActiveCaseId(visit === "sample" ? visit : visit?.id ?? null);
    setVisitLabel(visit === "sample" ? "" : visit?.label ?? "");
    setDraft(nextCase);
    setShowPaywall(false);
    setUnlocked(false);
    setStorageMessage("");
  }
  function saveCase(current: GuestCase) {
    try {
      const id = current.sample ? "sample" : activeCaseId ?? crypto.randomUUID();
      writeSavedCase(window.localStorage, current, id, visitLabel);
      setActiveCaseId(id);
      setSaved(readSavedCases(window.localStorage));
      setStorageMessage("Case saved on this browser.");
      return true;
    } catch {
      setStorageMessage("This browser could not save the case. Keep this page open to continue.");
      return false;
    }
  }
  function clearCase(sample: boolean, id: string | null) {
    try {
      clearSavedCase(window.localStorage, sample, id);
      setSaved(readSavedCases(window.localStorage));
      if ((sample && draft.sample) || (!sample && activeCaseId === id)) loadCase(newCase(false));
      setStorageMessage("Saved case cleared.");
    } catch {
      setStorageMessage("This browser could not clear the saved case.");
    }
  }

  return (
    <div className={styles.flow}>
      <div className={styles.startBar}>
        <div className={styles.actions}>
          <button className={styles.secondary} type="button" onClick={() => loadCase(newCase(true))}>Try a sample</button>
          <button className={styles.textButton} type="button" onClick={() => loadCase(newCase(false))}>Start a blank check</button>
          {resumeCase && <button className={styles.textButton} type="button" onClick={() => loadCase(resumeCase, latestVisit ?? "sample")}>Resume case</button>}
          {latestVisit && saved.sample && <button className={styles.textButton} type="button"
            onClick={() => loadCase(saved.sample!, "sample")}>Resume sample</button>}
        </div>
        {draft.sample && <span className={styles.badge}>Fictional sample</span>}
      </div>
      <HouseholdTracker visits={saved.visits} draft={draft} currentId={activeCaseId} savedDraft={activeSave}
        check={check} comparison={comparison} label={visitLabel} onLabel={setVisitLabel}
        onOpen={visit => loadCase(visit.draft, visit)} onDelete={id => clearCase(false, id)} />
      <QuickDemoScenarios onSelect={scenario => loadCase(newCase(true, scenario))}
        result={draft.sample ? comparison?.current ?? check : null} followUp={Boolean(comparison)} />
      <div className={styles.layout}>
          <section className={styles.section + " " + styles.firstSection} aria-label="First statement">
            <StepTitle number="1" title="Check your statement" />
            <SmartPaste key={formVersion} draft={draft.sample ? emptyBillDraft() : draft.first} sample={draft.sample}
              onApply={(patch, otherVisit) => {
                if (otherVisit && !saveCase(draft)) return false;
                if (draft.sample || otherVisit) {
                  const personal = newCase(false);
                  loadCase({ ...personal, first: { ...personal.first, ...patch } });
                } else {
                  updateFirst(patch);
                }
                return true;
              }} />
            <form onSubmit={(event) => {
              event.preventDefault();
              setDraft((current) => ({ ...current, checked: true }));
            }}>
              <div className={styles.fields}>
                <DateField label="Date of visit" value={draft.first.visitDate}
                  onChange={(visitDate) => updateFirst({ visitDate })} />
                <fieldset className={styles.fieldset}>
                  <legend>Explanation of benefits</legend>
                  <EobFields status={draft.first.eobStatus} date={draft.first.eobDate} amount={draft.first.responsibility}
                    onStatus={(eobStatus) => updateFirst({ eobStatus })} onDate={(eobDate) => updateFirst({ eobDate })}
                    onAmount={(responsibility) => updateFirst({ responsibility })} />
                </fieldset>
                <fieldset className={styles.fieldset}>
                  <legend>Statement from the clinic</legend>
                  <StatementFields scope={draft.first.statementScope} date={draft.first.statementDate} amount={draft.first.balance}
                    onScope={(statementScope) => updateFirst({ statementScope })}
                    onDate={(statementDate) => updateFirst({ statementDate })} onAmount={(balance) => updateFirst({ balance })} />
                </fieldset>
                <fieldset className={styles.fieldset}>
                  <legend>Your payments</legend>
                  <PaymentFields known={draft.first.paymentsKnown} payments={draft.first.payments}
                    onKnown={(paymentsKnown) => updateFirst({ paymentsKnown })} onPayments={(payments) => updateFirst({ payments })} />
                </fieldset>
                <label className={styles.check}>
                  <input type="checkbox" checked={draft.first.sameVisit}
                    onChange={(event) => updateFirst({ sameVisit: event.target.checked })} />
                  <span>These documents refer to the same patient, provider and visit.</span>
                </label>
                <button type="submit" className={styles.primary}>Check my bill</button>
              </div>
            </form>
          </section>

          <aside className={styles.resultRail} aria-label="Statement check results">
            <div className={styles.resultPanel} aria-live="polite">
              {check ? <BillCheckSummary input={first} check={check} title="First statement result" /> : (
                <div className={styles.empty}>
                  <h2>Your comparison</h2>
                  <p>Enter the EOB, clinic statement and payments to see the balance for this visit.</p>
                </div>
              )}
            </div>
            {check && (
              <div className={styles.actions}>
                <button className={styles.secondary} type="button" onClick={() => saveCase(draft)}>Save case</button>
                <button className={styles.textButton} type="button" onClick={() => {
                  if (showPaywall) reportRef.current?.focus();
                  setShowPaywall(true);
                }}>{unlocked ? "View case report" : "Unlock printable case report · Plus $9/month"}</button>
              </div>
            )}
            {storageMessage && <p role="status" className={styles.hint}>{storageMessage}</p>}
            {activeSave && <button type="button" className={styles.textButton}
              onClick={() => clearCase(draft.sample, activeCaseId)}>Clear saved case</button>}
          </aside>

        <div className={styles.steps}>
          {check && (
            <section className={styles.section} aria-label="Prepare my call">
              <StepTitle number="2" title="Prepare my call" />
              {draft.callOpen ? (
                <>
                  <BillCallGuidance input={first} check={check} />
                  <h3 className={styles.subheading}>Record the answer</h3>
                  <div className={styles.fieldGrid}>
                    <DateField label="Call date" value={draft.call.calledOn} onChange={(calledOn) => updateCall({ calledOn })} />
                    <MoneyField label="Promised balance" value={draft.call.promisedBalance}
                      onChange={(promisedBalance) => updateCall({ promisedBalance })} />
                    <DateField label="Follow-up date" value={draft.call.followUpOn} onChange={(followUpOn) => updateCall({ followUpOn })} />
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.secondary} type="button" onClick={() => saveCase(draft)}>Save case</button>
                    <FollowUpReminder caseId={draft.sample ? "sample" : activeCaseId} saved={activeSave} current={draft} />
                  </div>
                </>
              ) : (
                <button type="button" className={styles.secondary}
                  onClick={() => setDraft((current) => ({ ...current, callOpen: true }))}>Prepare my call</button>
              )}
            </section>
          )}

          {check && (
            <section className={styles.section} aria-label="Next statement">
              <StepTitle number="3" title="Check the next statement" />
              {draft.nextOpen ? (
                <form className={styles.fields} onSubmit={(event) => {
                  event.preventDefault();
                  setDraft((current) => ({ ...current, compared: true }));
                }}>
                  <StatementFields scope={draft.next.statementScope} date={draft.next.statementDate} amount={draft.next.balance}
                    onScope={(statementScope) => updateNext({ statementScope })}
                    onDate={(statementDate) => updateNext({ statementDate, sameDayRevision: false })}
                    onAmount={(balance) => updateNext({ balance })} />
                  <label className={styles.check}>
                    <input type="checkbox" checked={draft.next.sameVisit}
                      onChange={(event) => updateNext({ sameVisit: event.target.checked })} />
                    <span>This statement covers the same visit.</span>
                  </label>
                  {draft.next.statementDate && draft.next.statementDate === draft.first.statementDate && (
                    <label className={styles.check}>
                      <input type="checkbox" checked={draft.next.sameDayRevision}
                        onChange={(event) => updateNext({ sameDayRevision: event.target.checked })} />
                      <span>This is the revised statement with the same issue date.</span>
                    </label>
                  )}
                  <label className={styles.check}>
                    <input type="checkbox" checked={draft.next.editEob} onChange={(event) => {
                      if (event.target.checked) {
                        updateNext({ editEob: true, eobStatus: draft.first.eobStatus, eobDate: draft.first.eobDate,
                          responsibility: draft.first.responsibility });
                      } else {
                        updateNext({ editEob: false });
                      }
                    }} />
                    <span>I received a revised EOB.</span>
                  </label>
                  {draft.next.editEob && (
                    <EobFields status={draft.next.eobStatus} date={draft.next.eobDate} amount={draft.next.responsibility}
                      onStatus={(eobStatus) => updateNext({ eobStatus })} onDate={(eobDate) => updateNext({ eobDate })}
                      onAmount={(responsibility) => updateNext({ responsibility })} />
                  )}
                  <label className={styles.check}>
                    <input type="checkbox" checked={draft.next.editPayments} onChange={(event) => {
                      if (event.target.checked) {
                        updateNext({ editPayments: true, paymentsKnown: draft.first.paymentsKnown,
                          payments: draft.first.payments });
                      } else {
                        updateNext({ editPayments: false });
                      }
                    }} />
                    <span>I have a new or corrected payment.</span>
                  </label>
                  {draft.next.editPayments && (
                    <PaymentFields known={draft.next.paymentsKnown} payments={draft.next.payments}
                      onKnown={(paymentsKnown) => updateNext({ paymentsKnown })}
                      onPayments={(payments) => updateNext({ payments })}
                      keep={new Set(draft.first.payments.map((payment) => payment.id))} />
                  )}
                  <div className={styles.actions}>
                    <button className={styles.primary} type="submit">Compare statements</button>
                    {draft.compared && <button className={styles.secondary} type="button" onClick={() => saveCase(draft)}>Save case</button>}
                  </div>
                </form>
              ) : (
                <button type="button" className={styles.secondary}
                  onClick={() => setDraft((current) => ({ ...current, nextOpen: true }))}>Check next statement</button>
              )}
              {comparison && (
                <div className={styles.comparison} aria-live="polite">
                  <BillCheckSummary input={nextBill} check={comparison.current} title="New statement result" />
                  <BillComparisonSummary comparison={comparison} />
                  {comparison.current.call.question && <p className={styles.hint}>{comparison.current.call.question}</p>}
                  {resolution === "check_call_date" && <p className={styles.hint}>
                    Check the call date to compare this statement with the promised balance.
                  </p>}
                  {resolution === "await_later_statement" && <p className={styles.hint}>
                    Use a statement issued after the call to check the promised balance.
                  </p>}
                  {resolution === "ready" && (
                    draft.resolved
                      ? <p className={styles.resolved} role="status">Case marked as resolved.</p>
                      : <button type="button" className={styles.secondary} onClick={() => {
                        const resolved = { ...draft, resolved: true };
                        setDraft(resolved);
                        saveCase(resolved);
                      }}>Mark as resolved</button>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {showPaywall && check && (
        <section className={styles.report} ref={reportRef} tabIndex={-1} aria-label="Case report">
          {unlocked ? (
            <PrintableBillReport first={first} call={draft.callOpen ? call : null} next={draft.compared ? next : null} sample={draft.sample} />
          ) : (
            <DemoReportCheckout onUnlock={() => setUnlocked(true)} />
          )}
        </section>
      )}
    </div>
  );
}
