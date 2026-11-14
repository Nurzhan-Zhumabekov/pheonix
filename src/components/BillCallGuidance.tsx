"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { buildPortalMessage } from "@/lib/bill-portal";
import { parseUsdCents } from "@/lib/bill-money";
import { toBillInput, toCallRecord, type BillDraft, type CallDraft } from "@/lib/bill-draft";
import { checkBill } from "@/lib/bill-check";
import type { BillCheck, BillInput } from "@/lib/bill-types";
import { isIsoDate } from "@/lib/dates";
import { buildFollowUpIcs } from "@/lib/ics";
import styles from "./TryFlow.module.css";
import tabs from "./BillCallGuidance.module.css";

const callActions = {
  call_provider: { title: "Provider billing", hint: "Use the billing phone number printed on your clinic statement." },
  call_insurer: { title: "Your health plan", hint: "Use the number on your insurance card or EOB." },
  check_portal: { title: "Check the current balance", hint: "Open your provider’s portal and look for the balance for this visit." },
  review_input: { title: "Review the documents", hint: "Check the amounts and dates before contacting billing." },
  none: { title: "No call suggested", hint: "The amounts match for this statement." },
};

export function BillCallGuidance({ input, check }: { input: BillInput; check: BillCheck }) {
  const [tab, setTab] = useState<"phone" | "portal">("phone");
  const [feedback, setFeedback] = useState({ text: "", status: "" });
  const id = useId();
  const action = callActions[check.call.action];
  const insurer = check.call.action === "call_insurer";
  const phone = tab === "phone";
  const text = phone ? check.call.question : buildPortalMessage(input, check);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>) {
    let target: typeof tab;
    switch (event.key) {
      case "Home": target = "phone"; break;
      case "End": target = "portal"; break;
      case "ArrowLeft":
      case "ArrowRight": target = phone ? "portal" : "phone"; break;
      default: return;
    }
    event.preventDefault();
    setTab(target);
    document.getElementById(id + target)?.focus();
  }

  return (
    <div className={styles.guidance}>
      <div className={tabs.tabList} role="tablist" aria-label="How to contact billing">
        {(["phone", "portal"] as const).map(value => (
          <button type="button" role="tab" key={value} id={id + value}
            aria-selected={tab === value} aria-controls={id + "panel"} tabIndex={tab === value ? 0 : -1}
            onClick={() => setTab(value)} onKeyDown={moveFocus}>
            {value === "phone" ? "Phone call script" : insurer ? "Health plan portal message" : "MyChart / portal message"}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={id + "panel"} aria-labelledby={id + tab} tabIndex={0}>
        <h3>{phone ? action.title : insurer ? "Message your health plan" : "Message your clinic’s billing office"}</h3>
        <p>{phone ? action.hint : insurer ? "Paste this into your insurer’s secure member portal."
          : "Paste this into the billing section of MyChart or your clinic’s patient portal."}</p>
        {phone && check.call.action !== "none" && (
          <>
            <h4 className={tabs.checkTitle}>Have these ready</h4>
            <ul className={tabs.checklist}>
              <li>{insurer ? "Insurance card and claim reference, if available" : "Clinic statement and visit date"}</li>
              <li>{insurer ? "Clinic statement showing the date of service" : "Explanation of benefits and payment receipts"}</li>
            </ul>
          </>
        )}
        {text && <>
          <blockquote className={tabs.message}>{text}</blockquote>
          <button className={styles.secondary} type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setFeedback({ text, status: "Copied." });
            } catch {
              setFeedback({ text, status: "Select and copy the text above." });
            }
          }}>{phone ? "Copy text" : "Copy portal message"}</button>
          <span className={styles.inlineStatus} role="status">{feedback.text === text ? feedback.status : ""}</span>
        </>}
      </div>
    </div>
  );
}

type ReminderDraft = { call: CallDraft; first: BillDraft };

export function FollowUpReminder({ caseId, saved, current }: {
  caseId: string | null; saved: ReminderDraft | null; current: ReminderDraft;
}) {
  if (!caseId || !saved || !isIsoDate(saved.call.followUpOn) ||
      saved.call.followUpOn !== current.call.followUpOn || saved.call.promisedBalance !== current.call.promisedBalance ||
      saved.call.calledOn !== current.call.calledOn || saved.first.balance !== current.first.balance ||
      saved.first.sameVisit !== current.first.sameVisit || saved.first.statementScope !== current.first.statementScope) return null;
  const call = toCallRecord(saved.call);
  if (!call) return null;
  const originalBalance = saved.first.sameVisit && saved.first.statementScope === "visit" ? parseUsdCents(saved.first.balance) : null;
  const download = () => {
    const recipient = checkBill(toBillInput(saved.first)).call.action === "call_insurer" ? "insurer" : "clinic";
    const content = buildFollowUpIcs(caseId, call, originalBalance, new Date(), recipient);
    if (!content) return;
    const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.download = `BillShield-follow-up-${current.call.followUpOn}.ics`;
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <button type="button" className={styles.secondary} onClick={download}>Add Follow-Up Reminder (.ics)</button>;
}
