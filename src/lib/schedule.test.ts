import { describe, expect, it } from "vitest";
import { buildSchedule, timesForMedication } from "./schedule";
import { verifyPlan } from "./verify";
import { RAW_PLAN, SAMPLE_TEXT } from "./test-fixtures";

const plan = verifyPlan(RAW_PLAN, SAMPLE_TEXT);

describe("timesForMedication", () => {
  it("uses named times of day first", () => {
    expect(timesForMedication(plan.medications[1])).toEqual(["08:00"]);
  });

  it("spreads doses for a twice-a-day medicine", () => {
    expect(timesForMedication(plan.medications[0])).toEqual(["08:00", "20:00"]);
  });

  it("spaces 5 doses evenly between 08:00 and 22:00", () => {
    const med = { ...plan.medications[0], times_per_day: 5 };
    expect(timesForMedication(med)).toEqual(["08:00", "11:30", "15:00", "18:30", "22:00"]);
  });

  it("returns nothing when the dose frequency is unknown", () => {
    const med = { ...plan.medications[0], times_per_day: null, times_of_day: [] };
    expect(timesForMedication(med)).toEqual([]);
  });
});

describe("buildSchedule", () => {
  const schedule = buildSchedule(plan, "2026-11-12");

  it("schedules a 7-day twice-daily course as 14 doses", () => {
    const doses = schedule.days.flatMap((d) => d.items).filter((i) => i.title === "Amoxicillin-clavulanate");
    expect(doses).toHaveLength(14);
    expect(doses[0]).toMatchObject({ date: "2026-11-12", time: "08:00" });
    expect(doses.at(-1)).toMatchObject({ date: "2026-11-18", time: "20:00" });
  });

  it("runs an open-ended medicine across the 30-day horizon", () => {
    const doses = schedule.days.flatMap((d) => d.items).filter((i) => i.title === "Lisinopril");
    expect(doses).toHaveLength(30);
  });

  it("keeps as-needed and stopped medicines out of the calendar", () => {
    const titles = schedule.days.flatMap((d) => d.items).map((i) => i.title);
    expect(titles).not.toContain("Acetaminophen");
    expect(titles).not.toContain("Ibuprofen");
    expect(schedule.asNeeded.map((m) => m.name)).toEqual(["Acetaminophen"]);
    expect(schedule.stopped.map((m) => m.name)).toEqual(["Ibuprofen"]);
  });

  it("computes a relative appointment from the discharge date", () => {
    const appt = schedule.days.flatMap((d) => d.items).find((i) => i.kind === "appointment");
    expect(appt).toMatchObject({ title: "Primary care doctor", date: "2026-11-19" });
  });

  it("lists appointments without a date separately", () => {
    expect(schedule.needsDate.map((a) => a.title)).toEqual(["Chest X-ray"]);
  });

  it("sorts items within a day by time", () => {
    const first = schedule.days[0].items.map((i) => i.time);
    expect(first).toEqual([...first].sort());
  });
});
