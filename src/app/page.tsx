import Link from "next/link";
import { PlanCard } from "@/components/PlanCard";
import { site } from "@/config/site";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>{site.tagline}</h1>
          <p className="lead">{site.description}</p>
          <div className="actions">
            <Link href={site.cta.href} className="button">
              {site.cta.label}
            </Link>
            <Link href="/pricing" className="button button-outline">
              See pricing
            </Link>
          </div>
          <p className="muted">No sign-up needed.</p>
        </div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <h2>How it works</h2>
          <ol className="grid">
            {site.steps.map((step, i) => (
              <li key={step.title} className="card">
                <span className="step">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>Why people use it</h2>
          <div className="grid">
            {site.features.map((feature) => (
              <article key={feature.title} className="card">
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Pricing</h2>
          <div className="grid grid-2">
            {site.plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="section section-alt">
        <div className="container narrow">
          <h2>Questions</h2>
          {site.faq.map((item) => (
            <details key={item.q} className="faq">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
