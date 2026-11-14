import type { Metadata } from "next";
import { TryFlow } from "@/components/TryFlow";

export const metadata: Metadata = { title: "Check a bill" };

export default async function TryPage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[] }>;
}) {
  const { sample } = await searchParams;
  return (
    <section className="section" style={{ background: "#f7f6ee" }}>
      <div className="container">
        <h1>Check a medical bill</h1>
        <p className="lead">Compare a clinic statement with your insurance explanation of benefits and payment receipts.</p>
        <p className="notice">No account required. If you save a case, it stays in this browser.</p>
        <TryFlow key={sample === "1" ? "sample" : "blank"} startWithSample={sample === "1"} />
      </div>
    </section>
  );
}
