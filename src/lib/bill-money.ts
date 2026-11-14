const usdInput = /^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?|\.\d{1,2})$/;
const wholeDollars = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Parse the digits directly so no rounding or binary dollar arithmetic is needed. */
export function parseUsdCents(value: string): number | null {
  const amount = value.trim().replace(/^\$\s*/, "");
  if (!usdInput.test(amount)) return null;
  const [dollars, fraction = ""] = amount.replaceAll(",", "").split(".");
  const cents = Number(dollars + fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatUsdCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new RangeError("Expected a safe integer number of cents.");
  const absolute = Math.abs(cents);
  const fraction = absolute % 100;
  const dollars = (absolute - fraction) / 100;
  return (cents < 0 ? "-$" : "$") + wholeDollars.format(dollars) + "." + String(fraction).padStart(2, "0");
}
