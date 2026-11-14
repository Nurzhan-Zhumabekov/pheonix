import type { CallRecord } from "./bill-types";
import { formatUsdCents } from "./bill-money";
import { addDays, isIsoDate } from "./dates";
import type { Schedule, ScheduleItem } from "./schedule";

/** Builds an iCalendar (.ics) file from the schedule. Pure and browser-safe. */

const CRLF = "\r\n";

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds a line to at most 75 UTF-8 bytes, as RFC 5545 requires. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join(CRLF + " ");
}

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function compactTime(hhmm: string): string {
  return hhmm.replace(":", "") + "00";
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function eventLines(item: ScheduleItem, now: Date): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${item.id}@carepath`, `DTSTAMP:${stamp(now)}`];
  if (item.time) {
    lines.push(`DTSTART:${compactDate(item.date)}T${compactTime(item.time)}`);
    lines.push(`DTEND:${compactDate(item.date)}T${compactTime(addMinutes(item.time, 15))}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(item.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(item.date, 1))}`);
  }
  const prefix = item.kind === "medication" ? "Take: " : "Appointment: ";
  lines.push(`SUMMARY:${escapeText(prefix + item.title)}`);
  const description = [item.detail, `From the document: "${item.sourceQuote}"`]
    .filter(Boolean)
    .join("\n");
  lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (item.kind === "medication") {
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0M", `DESCRIPTION:${escapeText(item.title)}`, "END:VALARM");
  }
  lines.push("END:VEVENT");
  return lines;
}

export function buildIcs(schedule: Schedule, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Carepath//Discharge plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Carepath plan",
  ];
  for (const day of schedule.days) {
    for (const item of day.items) lines.push(...eventLines(item, now));
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** One all-day event per saved billing case. Re-exporting an edited promise keeps its UID. */
export function buildFollowUpIcs(
  caseId: string,
  call: CallRecord,
  statementBalanceCents: number | null,
  now: Date = new Date(),
  recipient: "clinic" | "insurer" = "clinic",
): string | null {
  if (!caseId || !isIsoDate(call.followUpOn)) return null;
  const knownAmount = (cents: number | null): cents is number =>
    cents !== null && Number.isSafeInteger(cents) && cents >= 0;
  let summary = recipient === "insurer" ? "Check health plan's claim update" : "Check clinic's revised statement";
  if (knownAmount(call.promisedBalanceCents)) {
    summary += " — promised balance " + formatUsdCents(call.promisedBalanceCents);
    if (knownAmount(statementBalanceCents)) summary += " (was " + formatUsdCents(statementBalanceCents) + ")";
  }
  const followUp = recipient === "insurer"
    ? "Ask your health plan for the claim status and the final explanation of benefits."
    : "Ask the billing office for the updated balance for this visit.";
  const description = isIsoDate(call.calledOn) ? `Follow up on your ${call.calledOn} call. ${followUp}` : followUp;
  const nextDay = addDays(call.followUpOn, 1);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BillShield US//Billing follow-up//EN",
    "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    "UID:" + encodeURIComponent(caseId) + "@billshield-us.vercel.app",
    "DTSTAMP:" + stamp(now),
    "DTSTART;VALUE=DATE:" + compactDate(call.followUpOn),
    ...(isIsoDate(nextDay) ? ["DTEND;VALUE=DATE:" + compactDate(nextDay)] : []),
    "SUMMARY:" + escapeText(summary),
    "DESCRIPTION:" + escapeText(description),
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT9H", "DESCRIPTION:" + escapeText(summary),
    "END:VALARM", "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}
