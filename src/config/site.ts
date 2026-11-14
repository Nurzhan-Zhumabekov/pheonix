/** Shared site copy, navigation, and demo prices. */

export type Plan = {
  id: string;
  name: string;
  price: number; // USD per period, 0 = free
  period: "month" | "year";
  annualPrice?: number;
  blurb: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

export type Link = { label: string; href: string };

export const site = {
  name: "BillShield US",
  tagline: "You already paid. Check the balance.",
  description: "Compare your insurance statement, your receipt, and your provider bill for the same visit. See what to ask and check what changes when a new bill arrives.",
  nav: [
    { label: "How it works", href: "/#how" },
    { label: "Pricing", href: "/pricing" },
    { label: "FAQ", href: "/#faq" },
  ] satisfies Link[],
  cta: { label: "Check my bill", href: "/try" } satisfies Link,
  sample: { label: "Try a sample", href: "/try?sample=1" } satisfies Link,
  steps: [
    { title: "Compare the amounts", text: "Use the patient responsibility from your final explanation of benefits (EOB), payments applied to the visit, and the balance on your statement." },
    { title: "Contact the right office", text: "Prepare a call or copy a portal message with your dates and amounts. Add a reminder for the day you expect a reply." },
    { title: "Check the next statement", text: "Save the balance the clinic quoted. When a new statement arrives, compare it with your original check and the amount you were told." },
  ],
  faq: [
    { q: "What do I need to get started?", a: "Have the final explanation of benefits from your insurer, a provider bill, and any receipts for the same visit. Check what each document covers before comparing the amounts." },
    { q: "What does a difference mean?", a: "A difference identifies an amount to clarify. A payment may have posted after the statement was issued, or the provider may need to explain how it was applied." },
    { q: "Where is my case saved?", a: "A saved case stays in this browser on this device. Use the clear option in the checker to remove it." },
    { q: "Does it cost anything to use?", a: "You can check a visit and its follow-up without an account or a payment. The printable Plus report is available through a free demo." },
  ],
  plans: [
    {
      id: "free",
      name: "Free",
      price: 0,
      period: "month",
      blurb: "Check one visit and see what changes on the next statement.",
      features: ["Compare the bill, EOB, and payments", "Call and portal messages", "Save household visits in this browser", "Check the next statement"],
      cta: "Check my bill",
      href: "/try",
    },
    {
      id: "plus",
      name: "Plus",
      price: 9,
      period: "month",
      annualPrice: 59,
      blurb: "Keep a clear record of the numbers and the follow-up.",
      features: ["Everything in Free", "Printable case summary", "Original and updated balances together", "Amounts and dates to reference during a call"],
      cta: "Unlock printable case report",
      href: "/pricing#report-checkout",
      highlighted: true,
    },
  ] satisfies Plan[],
};
