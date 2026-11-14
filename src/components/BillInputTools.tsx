"use client";

import { useState } from "react";
import { applyBillPaste, isDifferentVisit, parseBillText, pasteFieldLabels, type BillPastePreview } from "@/lib/bill-paste";
import type { BillDraft } from "@/lib/bill-draft";
import type { BillCheck } from "@/lib/bill-types";
import { formatUsdCents } from "@/lib/bill-money";
import { demoScenarios, type DemoScenario } from "@/samples/bill-sample";
import styles from "./BillInputTools.module.css";
import formStyles from "./TryFlow.module.css";

const actionText: Record<BillCheck["call"]["action"], string> = {
  call_provider: "Call provider billing",
  call_insurer: "Call your health plan",
  check_portal: "Check provider portal",
  review_input: "Review the documents",
  none: "No follow-up needed",
};

export function QuickDemoScenarios({ onSelect, result, followUp }: {
  onSelect: (scenario: DemoScenario) => void; result: BillCheck | null; followUp: boolean;
}) {
  return (
    <fieldset className={styles.scenarios}>
      <legend>Quick demo scenarios</legend>
      <div className={styles.buttons}>
        {demoScenarios.map(scenario => (
          <button type="button" key={scenario.id} onClick={() => onSelect(scenario.id)}>{scenario.label}</button>
        ))}
      </div>
      {result && <p className={styles.outcome} aria-live="polite">
        {followUp ? "Next statement" : "First statement"} · {" "}
        {result.status === "possible_credit" && result.possibleCreditCents !== null &&
          formatUsdCents(result.possibleCreditCents) + " possible credit · "}
        {result.status === "above_expected" && result.differenceCents !== null &&
          formatUsdCents(result.differenceCents) + " to clarify · "}
        {actionText[result.call.action]}
      </p>}
    </fieldset>
  );
}

export function SmartPaste({ draft, sample, onApply }: {
  draft: BillDraft; sample: boolean; onApply: (patch: Partial<BillDraft>, otherVisit: boolean) => boolean;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<BillPastePreview | null>(null);
  const [confirmPosting, setConfirmPosting] = useState(false);
  const [notice, setNotice] = useState("");
  const keys = preview ? Object.keys(preview.fields) as (keyof typeof pasteFieldLabels)[] : [];
  const receipt = preview?.receipt;
  const hasValues = keys.length > 0 || !!receipt;
  const otherVisit = isDifferentVisit(draft.visitDate, preview?.fields.visitDate);
  return (
    <details className={styles.paste}>
      <summary>Paste text from EOB or clinic SMS</summary>
      <div className={styles.panel}>
        <label className={formStyles.field}>
          <span>Billing text</span>
          <textarea rows={3} maxLength={30000} value={text} onChange={event => {
            setText(event.target.value);
            setPreview(null);
            setConfirmPosting(false);
            setNotice("");
          }} placeholder="Visit 2026-05-05, EOB patient responsibility $600, paid $150 on 2026-05-06, statement balance $600 on 2026-05-10" />
        </label>
        <p className={formStyles.hint}>
          The text is read on this device. {sample && "Applying fields starts a separate personal check."}
        </p>
        <button className={formStyles.secondary} type="button" disabled={!text.trim()} onClick={() => {
          setPreview(parseBillText(text));
          setNotice("");
        }}>Preview fields</button>
        {preview && (
          <div className={styles.preview} aria-live="polite">
            {hasValues ? <h3>Review matched fields</h3> : <p>No fields could be applied. Try a labeled amount or enter it below.</p>}
            {hasValues && (
              <dl>
                {keys.map(key => <div key={key}><dt>{pasteFieldLabels[key]}</dt>
                  <dd>{key === "balance" || key === "responsibility" ? "$" : ""}{preview.fields[key]}</dd></div>)}
                {receipt && <div><dt>Receipt amount</dt><dd>${receipt.amount}</dd></div>}
                {receipt?.paidOn && <div><dt>Payment date</dt><dd>{receipt.paidOn}</dd></div>}
                {receipt?.postedOn && <div><dt>Posted on</dt><dd>{receipt.postedOn}</dd></div>}
              </dl>
            )}
            {preview.notes.map(note => <p key={note} className={formStyles.hint}>{note}</p>)}
            {otherVisit && <p className={formStyles.hint}>
              The pasted visit is dated {preview.fields.visitDate}. Save the open visit
              from {draft.visitDate} on this device and start a separate check.
            </p>}
            {receipt?.paidOn && !receipt.postedOn && <label className={formStyles.check}>
              <input type="checkbox" checked={confirmPosting} onChange={event => setConfirmPosting(event.target.checked)} />
              The clinic posted this payment on {receipt.paidOn}.
            </label>}
            {hasValues && (
              <button type="button" className={formStyles.primary} onClick={() => {
                if (!onApply(applyBillPaste(draft, preview, confirmPosting), otherVisit)) {
                  setNotice("The current visit could not be saved. Your edits are still open.");
                  return;
                }
                setText(""); setPreview(null); setConfirmPosting(false);
                setNotice("Fields applied. Review the details below before checking the bill.");
              }}>{otherVisit ? "Save current visit and start a new check" : "Apply matched fields"}</button>
            )}
          </div>
        )}
        {notice && <p role="status" className={formStyles.hint}>{notice}</p>}
      </div>
    </details>
  );
}
