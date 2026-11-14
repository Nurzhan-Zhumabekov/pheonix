import Link from "next/link";
import { site } from "@/config/site";
import { checkBill } from "@/lib/bill-check";
import { formatUsdCents } from "@/lib/bill-money";
import { createBillSample } from "@/samples/bill-sample";
import styles from "./marketing.module.css";

function BillPreview() {
  const { first } = createBillSample();
  const result = checkBill(first);
  const entries = [
    ["Patient responsibility", first.eob.patientResponsibilityCents],
    ["Payment applied", result.postedCents],
    ["Expected balance", result.expectedBalanceCents],
    ["Provider statement", first.statement.balanceCents],
  ] as const;

  return (
    <figure className={styles.preview}>
      <figcaption className={styles.previewHeading}>
        <span>Statement check</span>
        <span>Sample visit</span>
      </figcaption>
      <dl className={styles.previewItems}>
        {entries.map(([label, amount]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{amount === null ? "—" : formatUsdCents(amount)}</dd>
          </div>
        ))}
        {result.differenceCents !== null && (
          <div className={styles.previewResult}>
            <dt>Amount to clarify</dt>
            <dd>{formatUsdCents(result.differenceCents)}</dd>
          </div>
        )}
      </dl>
      <p className={styles.previewNext}>Ask billing whether the payment was applied to this visit.</p>
    </figure>
  );
}

export default function HomePage() {
  return (
    <div className={styles.marketing}>
      <section className={styles.hero}>
        <div className={styles.container + " " + styles.heroColumns}>
          <div className={styles.heroCopy}>
            <h1>{site.tagline}</h1>
            <p className={styles.lead}>{site.description}</p>
            <div className={styles.actions}>
              <Link href={site.cta.href} className={styles.primary}>
                {site.cta.label} <span aria-hidden="true">→</span>
              </Link>
              <Link href={site.sample.href} className={styles.secondary}>
                {site.sample.label}
              </Link>
            </div>
            <p className={styles.guestNote}>Free to check a visit. No account required.</p>
          </div>
          <BillPreview />
        </div>
      </section>

      <section id="how" className={styles.section}>
        <div className={styles.container}>
          <h2>From the first bill to the follow-up</h2>
          <ol className={styles.steps}>
            {site.steps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true" className={styles.stepNumber}>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className={styles.section + " " + styles.faqSection}>
        <div className={styles.container + " " + styles.faqColumns}>
          <div>
            <h2>Common questions</h2>
            <Link href="/pricing" className={styles.textLink}>View pricing <span aria-hidden="true">→</span></Link>
          </div>
          <div className={styles.questions}>
            {site.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}