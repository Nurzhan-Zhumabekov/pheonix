/** Everything you edit to rebrand the site lives here. */

export type Plan = {
  id: string;
  name: string;
  price: number; // USD per period, 0 = free
  period: "month" | "year";
  blurb: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

export type Link = { label: string; href: string };

export const site = {
  name: "Your Product",
  tagline: "One clear sentence about the problem you solve.",
  description: "A short description for search results and link previews.",
  nav: [
    { label: "How it works", href: "/#how" },
    { label: "Pricing", href: "/pricing" },
    { label: "FAQ", href: "/#faq" },
  ] satisfies Link[],
  cta: { label: "Try it as a guest", href: "/try" } satisfies Link,
  steps: [
    { title: "Add your input", text: "Describe the first thing the user does." },
    { title: "Get a result", text: "Describe what the product does with it." },
    { title: "Come back", text: "Describe why the user returns next week." },
  ],
  features: [
    { title: "Feature one", text: "A concrete benefit, not a technology." },
    { title: "Feature two", text: "A concrete benefit, not a technology." },
    { title: "Feature three", text: "A concrete benefit, not a technology." },
  ],
  faq: [
    { q: "Do I need an account?", a: "No. You can try the full flow as a guest." },
    { q: "How much does it cost?", a: "The free plan covers the core flow. Paid plans are on the pricing page." },
    { q: "Where is my data stored?", a: "Say exactly what is stored, where, and for how long." },
    { q: "How do I cancel?", a: "Say how, in one sentence." },
  ],
  plans: [
    {
      id: "free",
      name: "Free",
      price: 0,
      period: "month",
      blurb: "Try the core flow.",
      features: ["Core flow", "Guest mode", "Saved on this device"],
      cta: "Start free",
      href: "/try",
    },
    {
      id: "plus",
      name: "Plus",
      price: 9,
      period: "month",
      blurb: "For regular use.",
      features: ["Everything in Free", "Unlimited use", "Reminders and history"],
      cta: "Upgrade",
      href: "/pricing#checkout",
      highlighted: true,
    },
  ] satisfies Plan[],
};
