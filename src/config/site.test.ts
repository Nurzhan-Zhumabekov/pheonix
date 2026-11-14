import { describe, expect, it } from "vitest";
import { site } from "./site";

describe("site config", () => {
  it("links stay inside the site", () => {
    const links = [...site.nav.map((n) => n.href), site.cta.href, ...site.plans.map((p) => p.href)];
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
});
