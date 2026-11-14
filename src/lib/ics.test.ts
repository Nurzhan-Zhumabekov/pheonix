import { describe, expect, it } from "vitest";
import { buildFollowUpIcs, buildIcs, escapeText, foldLine } from "./ics";
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

describe("billing follow-up calendar", () => {
  const call = { calledOn: "2026-05-11", promisedBalanceCents: 45000, followUpOn: "2026-05-15" };

  it("exports the saved day, a same-day alarm and the promised and original amounts", () => {
    const file = buildFollowUpIcs("test-visit", call, 60000, now)!;
    const unfolded = file.replace(/\r\n /g, "");
    expect(unfolded).toContain("DTSTART;VALUE=DATE:20260515\r\nDTEND;VALUE=DATE:20260516");
    expect(unfolded).toContain("SUMMARY:Check clinic's revised statement — promised balance $450.00 (was $600.00)");
    expect(unfolded).toContain("2026-05-11 call");
    expect(unfolded).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT9H");
    expect(file).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(file).toMatch(/END:VCALENDAR\r\n$/);
    expect(file).not.toContain("Carepath");
    for (const line of file.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("keeps one event identity when a promise changes and a separate identity for another case", () => {
    const uid = (file: string | null) => file?.match(/^UID:(.*)\r$/m)?.[1];
    const first = uid(buildFollowUpIcs("one", call, 60000, now));
    expect(first).toBeTruthy();
    expect(uid(buildFollowUpIcs("one", { ...call, followUpOn: "2026-06-01" }, 50000, now))).toBe(first);
    expect(uid(buildFollowUpIcs("two", call, 60000, now))).not.toBe(first);
  });

  it("allows a callback without a numeric promise, preserves a zero promise and requires a valid date", () => {
    expect(buildFollowUpIcs("one", { ...call, promisedBalanceCents: null }, null, now))
      .toContain("SUMMARY:Check clinic's revised statement\r\n");
    expect(buildFollowUpIcs("one", { ...call, promisedBalanceCents: 0 }, null, now)).toContain("promised balance $0.00");
    expect(buildFollowUpIcs("one", { ...call, followUpOn: "2026-02-30" }, 60000, now)).toBeNull();
    expect(buildFollowUpIcs("one", { ...call, followUpOn: null }, 60000, now)).toBeNull();
  });

  it("names the insurer for a claim status follow-up", () => {
    const file = buildFollowUpIcs("claim", { ...call, promisedBalanceCents: null }, null, now, "insurer");
    expect(file).toContain("SUMMARY:Check health plan's claim update");
  });
});
