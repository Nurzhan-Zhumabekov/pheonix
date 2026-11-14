"use client";

import { useEffect, useRef, useState } from "react";
import { pricingReport } from "@/lib/pricing-report";
import { DemoReportCheckout } from "@/components/DemoReportCheckout";
import { PrintableBillReport } from "@/components/PrintableBillReport";
import styles from "../marketing.module.css";

export function PricingReportCheckout() {
  const [report, setReport] = useState<ReturnType<typeof pricingReport> | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    function showRequestedCheckout() {
      setReport(window.location.hash === "#report-checkout" ? pricingReport() : null);
      setUnlocked(false);
    }
    showRequestedCheckout();
    window.addEventListener("hashchange", showRequestedCheckout);
    return () => window.removeEventListener("hashchange", showRequestedCheckout);
  }, []);

  useEffect(() => { if (report) panel.current?.focus(); }, [report, unlocked]);

  return (
    <section id="report-checkout" ref={panel} hidden={!report} tabIndex={-1}
      aria-label="Plus report checkout" className={styles.checkoutPanel}>
      {report && (unlocked ? <PrintableBillReport {...report} /> : (
        <>
          <p>{report.sample ? "Fictional sample" : "Your saved or open visit"}{report.first.visitDate && ` · ${report.first.visitDate}`}</p>
          <DemoReportCheckout onUnlock={() => setUnlocked(true)} />
        </>
      ))}
    </section>
  );
}
