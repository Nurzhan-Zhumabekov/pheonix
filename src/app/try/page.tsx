import type { Metadata } from "next";
import { TryFlow } from "@/components/TryFlow";

export const metadata: Metadata = { title: "Try it" };

export default function TryPage() {
  return (
    <section className="section">
      <div className="container narrow">
        <h1>Try it</h1>
        <p className="notice">Guest mode. No account needed. Your last result is kept on this device only.</p>
        <TryFlow />
      </div>
    </section>
  );
}
