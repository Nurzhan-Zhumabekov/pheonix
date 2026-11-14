import type { Metadata } from "next";
import { PrintableBillReport } from "@/components/PrintableBillReport";
import { createBillSample } from "@/samples/bill-sample";
import styles from "./sample.module.css";

export const metadata: Metadata = {
  title: { absolute: "BillShield US | Sample billing report" },
  description: "A printable example of a first bill check, a recorded call and a follow-up statement.",
};

export default function SampleReportPage() {
  return (
    <section className={styles.sample}>
      <PrintableBillReport {...createBillSample()} sample />
    </section>
  );
}
