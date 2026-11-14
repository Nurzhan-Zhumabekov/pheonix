import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine } from "./ics";
import { buildSchedule } from "./schedule";
import { verifyPlan } from "./verify";
import { RAW_PLAN, SAMPLE_TEXT } from "./test-fixtures";

const now = new Date("2026-11-12T10:00:00Z");
const schedule = buildSchedule(verifyPlan(RAW_PLAN, SAMPLE_TEXT), "2026-11-12");
const ics = buildIcs(schedule, now);

describe("buildIcs", () => {
  it("produces a calendar with one event per scheduled item", () => {
    const count = schedule.days.reduce((n, d) => n + d.items.length, 0);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(count);
  });

  it("uses floating local time for doses and all-day dates for appointments", () => {
    expect(ics).toContain("DTSTART:20261112T080000");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261119");
  });

  it("never exceeds 75 bytes per physical line", () => {
    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("gives every event a unique UID", () => {
    const uids = ics.match(/^UID:.*$/gm) ?? [];
    expect(new Set(uids).size).toBe(uids.length);
  });
});

describe("text helpers", () => {
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe(String.raw`a\,b\;c\\d\ne`);
  });

  it("folds long lines without splitting a multi-byte character", () => {
    const folded = foldLine("SUMMARY:" + "é".repeat(60));
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe("SUMMARY:" + "é".repeat(60));
  });
});
