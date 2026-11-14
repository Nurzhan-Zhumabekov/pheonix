import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { PricingReportCheckout } from "./PricingReportCheckout";
import styles from "../marketing.module.css";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className={styles.marketing + " " + styles.pricingPage}>
      <section className={styles.section}>
        <div className={styles.container}>
          <h1>Pricing</h1>
          <p className={styles.lead}>Check one visit and its next statement for free.</p>
          <div className={styles.planGrid}>
            {site.plans.map((plan) => (
              <article key={plan.id} className={plan.highlighted ? styles.plan + " " + styles.featuredPlan : styles.plan}>
                <h2>{plan.name}</h2>
                <p className={styles.price}>
                  ${plan.price}
                  {plan.price > 0 && <span> / {plan.period}</span>}
                </p>
                {plan.annualPrice && (
                  <p className={styles.annualPrice}>or ${plan.annualPrice} / year · proposed pricing</p>
                )}
                <p>{plan.blurb}</p>
                <ul>
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                {plan.id === "plus" ? (
                  <a href={plan.href} className={styles.primary}>{plan.cta} <span aria-hidden="true">→</span></a>
                ) : (
                  <Link href={plan.href} className={styles.secondary}>{plan.cta} <span aria-hidden="true">→</span></Link>
                )}
              </article>
            ))}
          </div>
          <p className={styles.pricingNote}>
            The Plus report is available to try without payment. <Link href="/report/sample">See a sample report.</Link>
          </p>
          <PricingReportCheckout />
        </div>
      </section>
    </div>
  );
}
