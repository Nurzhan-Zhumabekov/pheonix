import Link from "next/link";
import type { Plan } from "@/config/site";

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className={plan.highlighted ? "card plan plan-highlight" : "card plan"}>
      <h3>{plan.name}</h3>
      <p className="price">
        {plan.price === 0 ? "$0" : `$${plan.price}`}
        <span> / {plan.period}</span>
      </p>
      <p className="muted">{plan.blurb}</p>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <Link href={plan.href} className={plan.highlighted ? "button" : "button button-outline"}>
        {plan.cta}
      </Link>
    </article>
  );
}
