"use client";

import { site } from "@/config/site";
import { formatUsdCents } from "@/lib/bill-money";
import styles from "./DemoReportCheckout.module.css";

const monthlyPrice = formatUsdCents(site.plans.find(plan => plan.id === "plus")!.price * 100);

export function DemoReportCheckout({ onUnlock }: { onUnlock: () => void }) {
  return (
    <form className={styles.checkout} onSubmit={event => { event.preventDefault(); onUnlock(); }}>
      <h2>Unlock printable case report</h2>
      <p>BillShield Plus · {monthlyPrice}/month</p>
      <label>
        Test card
        <input value="4242 4242 4242 4242" type="text" readOnly autoComplete="off" dir="ltr" />
      </label>
      <p className={styles.note}>Demo checkout. No real charge or subscription.</p>
      <button type="submit">Unlock in Demo ({monthlyPrice} Test Checkout)</button>
    </form>
  );
}
