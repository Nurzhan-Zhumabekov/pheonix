import { addDays } from "./dates";
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
