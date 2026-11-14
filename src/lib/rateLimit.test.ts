import { beforeEach, describe, expect, it } from "vitest";
import { allowRequest, resetRateLimit } from "./rateLimit";

describe("allowRequest", () => {
  beforeEach(resetRateLimit);

  it("blocks after the limit and frees up after an hour", () => {
    const t0 = 1_000_000;
    expect(allowRequest("ip", 2, t0)).toBe(true);
    expect(allowRequest("ip", 2, t0 + 1)).toBe(true);
    expect(allowRequest("ip", 2, t0 + 2)).toBe(false);
    expect(allowRequest("ip", 2, t0 + 60 * 60 * 1000 + 3)).toBe(true);
  });

  it("counts each client separately", () => {
    expect(allowRequest("a", 1)).toBe(true);
    expect(allowRequest("b", 1)).toBe(true);
  });
});
