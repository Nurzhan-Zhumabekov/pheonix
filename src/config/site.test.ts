import { describe, expect, it } from "vitest";
import { site } from "./site";

describe("site config", () => {
  it("links stay inside the site", () => {
    const links = [
      ...site.nav.map((link) => link.href),
      site.cta.href,
      site.sample.href,
      ...site.plans.map((plan) => plan.href),
    ];
    for (const href of links) expect(href.startsWith("/")).toBe(true);
  });

  it("has exactly one highlighted plan and no negative prices", () => {
    expect(site.plans.filter((p) => p.highlighted)).toHaveLength(1);
    for (const plan of site.plans) expect(plan.price).toBeGreaterThanOrEqual(0);
  });

  it("uses unique plan ids", () => {
    const ids = site.plans.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("offers a free follow-up and routes report access through the demo", () => {
    const free = site.plans.find((plan) => plan.id === "free");
    const plus = site.plans.find((plan) => plan.id === "plus");

    expect(free?.features).toContain("Check the next statement");
    expect(free?.href).toBe("/try");
    expect(plus).toMatchObject({ price: 9, annualPrice: 59, href: site.sample.href });
  });
});
