import { describe, expect, it } from "vitest";
import { formatUsdCents, parseUsdCents } from "./bill-money";

describe("parseUsdCents", () => {
  it("parses US form input exactly, including zero and the largest safe amount", () => {
    const examples: [string, number][] = [
      ["0", 0], ["0.01", 1], [".50", 50], ["0.29", 29], ["5.3", 530], ["150", 15000],
      ["  $1,234.50  ", 123450], ["90,071,992,547,409.91", Number.MAX_SAFE_INTEGER],
    ];
    for (const [value, expected] of examples) expect(parseUsdCents(value)).toBe(expected);
  });

  it("keeps missing, malformed, negative and out-of-range values unknown", () => {
    for (const value of ["", " ", "$", ".", "1.234", "12,34.50", "-$10", "-0.01", "1e2", "1 2", "90,071,992,547,409.92"]) {
      expect(parseUsdCents(value)).toBeNull();
    }
  });
});

describe("formatUsdCents", () => {
  it("formats signed differences and safe-integer limits without losing a cent", () => {
    expect(formatUsdCents(-1)).toBe("-$0.01");
    expect(formatUsdCents(0)).toBe("$0.00");
    expect(formatUsdCents(123450)).toBe("$1,234.50");
    expect(formatUsdCents(Number.MAX_SAFE_INTEGER)).toBe("$90,071,992,547,409.91");
    expect(() => formatUsdCents(1.5)).toThrow(RangeError);
  });
});
