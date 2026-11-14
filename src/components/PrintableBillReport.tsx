"use client";

import { BillReport, type BillReportProps } from "./BillReport";
import styles from "./PrintableBillReport.module.css";

/** Render for the currently open case after the interface unlocks its report. */
export function PrintableBillReport(props: BillReportProps) {
  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <button type="button" className="button" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
      <div className={styles.paper}>
        <BillReport {...props} />
      </div>
    </div>
  );
}
