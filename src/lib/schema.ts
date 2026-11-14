import { z } from "zod";

/**
 * Structure the model must return for a hospital discharge document.
 * Every item carries `source_quote`, a verbatim excerpt of the document,
 * so the server can check it and the user can see where it came from.
 */

export const TimeOfDay = z.enum(["morning", "noon", "evening", "bedtime"]);
export type TimeOfDay = z.infer<typeof TimeOfDay>;

export const MedicationSchema = z.object({
  name: z.string(),
  dose: z.string().nullable(),
  instructions: z.string().nullable().describe("How to take it, as written (e.g. with food)"),
  status: z.enum(["new", "changed", "continue", "stop"]).nullable(),
  as_needed: z.boolean().describe("True when the document says to take it only when needed"),
  times_per_day: z.number().int().min(1).max(8).nullable(),
  times_of_day: z.array(TimeOfDay).describe("Only when the document names times of day"),
  duration_days: z.number().int().min(1).max(365).nullable(),
  source_quote: z.string(),
});

export const AppointmentSchema = z.object({
  title: z.string(),
  date_iso: z.string().nullable().describe("YYYY-MM-DD, only if the document gives an exact date"),
  days_after_discharge: z.number().int().min(0).max(365).nullable(),
  notes: z.string().nullable(),
  source_quote: z.string(),
});

export const NoteSchema = z.object({
  text: z.string(),
  source_quote: z.string(),
});

export const QuestionSchema = z.object({
  text: z.string().describe("A question for the care team about something the document leaves unclear"),
  based_on_quote: z.string().nullable(),
});

export const PlanSchema = z.object({
  is_discharge_document: z.boolean(),
  summary: z.string().describe("At most 3 plain sentences, using only the document"),
  discharge_date_iso: z.string().nullable(),
  medications: z.array(MedicationSchema),
  appointments: z.array(AppointmentSchema),
  restrictions: z.array(NoteSchema),
  warning_signs: z.array(NoteSchema).describe("Symptoms the document says require a call or emergency care"),
  questions_for_doctor: z.array(QuestionSchema),
});

export type RawPlan = z.infer<typeof PlanSchema>;

/** A plan item after the server checked its quote against the document. */
export type Checked<T> = T & { verified: boolean };

export type Plan = Omit<
  RawPlan,
  "medications" | "appointments" | "restrictions" | "warning_signs"
> & {
  medications: Checked<z.infer<typeof MedicationSchema>>[];
  appointments: Checked<z.infer<typeof AppointmentSchema>>[];
  restrictions: Checked<z.infer<typeof NoteSchema>>[];
  warning_signs: Checked<z.infer<typeof NoteSchema>>[];
};

/** What the API tool must return: the plan, plus a transcription for file inputs. */
export function toolSchema(withTranscription: boolean) {
  const shape = withTranscription
    ? z.object({ document_text: z.string(), plan: PlanSchema })
    : z.object({ plan: PlanSchema });
  const json = z.toJSONSchema(shape, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}
