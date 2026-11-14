import { addDays, isIsoDate } from "./dates";
import type { Plan, TimeOfDay } from "./schema";

/**
 * Turns the extracted plan into a day-by-day schedule.
 * The model only reads the document; every date and time here is computed by code.
 */

export type ScheduleItem = {
  id: string;
  kind: "medication" | "appointment";
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM (24h), null = all day
  title: string;
  detail: string | null;
  sourceQuote: string;
  verified: boolean;
};

export type DaySchedule = { date: string; items: ScheduleItem[] };

export type Schedule = {
  days: DaySchedule[];
  /** Appointments the document mentions without a usable date. */
  needsDate: Plan["appointments"];
  /** Medicines the document says to take only when needed. */
  asNeeded: Plan["medications"];
  /** Medicines the document says to stop. */
  stopped: Plan["medications"];
};

const TIME_OF_DAY: Record<TimeOfDay, string> = {
  morning: "08:00",
  noon: "12:00",
  evening: "18:00",
  bedtime: "21:30",
};

const DEFAULT_TIMES: Record<number, string[]> = {
  1: ["08:00"],
  2: ["08:00", "20:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

export function timesForMedication(med: Plan["medications"][number]): string[] {
  if (med.times_of_day.length > 0) {
    return [...new Set(med.times_of_day.map((t) => TIME_OF_DAY[t]))].sort();
  }
  const n = med.times_per_day;
  if (!n) return [];
  if (DEFAULT_TIMES[n]) return DEFAULT_TIMES[n];
  // 5+ doses: spread evenly between 08:00 and 22:00
  const span = 14 * 60;
  return Array.from({ length: n }, (_, i) => {
    const minutes = 8 * 60 + Math.round((span * i) / (n - 1));
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
}

export function buildSchedule(plan: Plan, startDate: string, horizonDays = 30): Schedule {
  const anchor = isIsoDate(plan.discharge_date_iso) ? plan.discharge_date_iso : startDate;
  const byDate = new Map<string, ScheduleItem[]>();
  const push = (item: ScheduleItem) => {
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  };

  const asNeeded: Plan["medications"] = [];
  const stopped: Plan["medications"] = [];

  plan.medications.forEach((med, medIndex) => {
    if (med.status === "stop") {
      stopped.push(med);
      return;
    }
    if (med.as_needed) {
      asNeeded.push(med);
      return;
    }
    const times = timesForMedication(med);
    if (times.length === 0) return;
    const days = Math.min(med.duration_days ?? horizonDays, horizonDays);
    const detail = [med.dose, med.instructions].filter(Boolean).join(", ") || null;
    for (let d = 0; d < days; d++) {
      const date = addDays(startDate, d);
      for (const time of times) {
        push({
          id: `med:${medIndex}:${date}:${time}`,
          kind: "medication",
          date,
          time,
          title: med.name,
          detail,
          sourceQuote: med.source_quote,
          verified: med.verified,
        });
      }
    }
  });

  const needsDate: Plan["appointments"] = [];
  plan.appointments.forEach((appt, apptIndex) => {
    const date = isIsoDate(appt.date_iso)
      ? appt.date_iso
      : appt.days_after_discharge !== null
        ? addDays(anchor, appt.days_after_discharge)
        : null;
    if (!date) {
      needsDate.push(appt);
      return;
    }
    push({
      id: `appt:${apptIndex}:${date}`,
      kind: "appointment",
      date,
      time: null,
      title: appt.title,
      detail: appt.notes,
      sourceQuote: appt.source_quote,
      verified: appt.verified,
    });
  });

  const days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      items: items.sort((x, y) => (x.time ?? "00:00").localeCompare(y.time ?? "00:00")),
    }));

  return { days, needsDate, asNeeded, stopped };
}
