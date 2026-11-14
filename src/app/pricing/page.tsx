import type { Metadata } from "next";
import { PlanCard } from "@/components/PlanCard";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <section className="section">
      <div className="container">
        <h1>Pricing</h1>
        <p className="lead">Start free. Upgrade when you use it every week.</p>
        <div className="grid grid-2">
          {site.plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
        <div id="checkout" className="card checkout">
          <h2>Checkout</h2>
          <p className="muted">
            Connect a payment provider in test mode here, and show the test card on screen so anyone can complete it.
          </p>
        </div>
      </div>
    </section>
  );
}
