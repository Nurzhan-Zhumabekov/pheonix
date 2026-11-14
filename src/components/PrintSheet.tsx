import { formatDay, formatTime } from "@/lib/dates";
import type { Schedule } from "@/lib/schedule";
import { timesForMedication } from "@/lib/schedule";
import type { Plan } from "@/lib/schema";

/** One-page, large-type version for the fridge. Visible only when printing. */
export function PrintSheet({ plan, schedule }: { plan: Plan; schedule: Schedule }) {
  const scheduledMeds = plan.medications.filter((m) => m.status !== "stop" && !m.as_needed);
  const appointments = schedule.days.flatMap((d) => d.items).filter((i) => i.kind === "appointment");
  return (
    <section className="print-only sheet" aria-hidden="true">
      <h1>Care plan</h1>
      <p>{plan.summary}</p>
      <h2>Medicines</h2>
      <ul>
        {scheduledMeds.map((m) => (
          <li key={m.name}>
            <strong>{m.name}</strong> {m.dose}: {timesForMedication(m).map(formatTime).join(", ") || "see instructions"}
            {m.duration_days ? ` for ${m.duration_days} days` : ""}
          </li>
        ))}
        {schedule.asNeeded.map((m) => (
          <li key={m.name}>
            <strong>{m.name}</strong> {m.dose}: only when needed. {m.instructions}
          </li>
        ))}
      </ul>
      {schedule.stopped.length > 0 && (
        <>
          <h2>Stop taking</h2>
          <ul>
            {schedule.stopped.map((m) => (
              <li key={m.name}>
                <strong>{m.name}</strong> {m.instructions}
              </li>
            ))}
          </ul>
        </>
      )}
      <h2>Appointments</h2>
      <ul>
        {appointments.map((a) => (
          <li key={a.id}>
            {formatDay(a.date)}: {a.title}
          </li>
        ))}
        {schedule.needsDate.map((a) => (
          <li key={a.title}>Needs a date: {a.title}</li>
        ))}
      </ul>
      <h2>Call the doctor or go to the emergency room if</h2>
      <ul>
        {plan.warning_signs.map((w) => (
          <li key={w.text}>{w.text}</li>
        ))}
      </ul>
      <p className="fine">Summary of the hospital papers. Not medical advice. Follow the original document.</p>
    </section>
  );
}
