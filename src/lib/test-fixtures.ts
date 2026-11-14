import type { RawPlan } from "./schema";
import { SAMPLE_DISCHARGE_TEXT } from "@/samples/discharge-sample";

/** A plan as the model would return it for the sample document. Test use only. */
export const RAW_PLAN: RawPlan = {
  is_discharge_document: true,
  summary: "Hospital stay for pneumonia. Take the new antibiotic and steroid, then see the primary care doctor in a week.",
  discharge_date_iso: "2026-11-12",
  medications: [
    {
      name: "Amoxicillin-clavulanate",
      dose: "875/125 mg tablet",
      instructions: "with food",
      status: "new",
      as_needed: false,
      times_per_day: 2,
      times_of_day: [],
      duration_days: 7,
      source_quote: "Take 1 tablet twice a day with food for 7 days.",
    },
    {
      name: "Lisinopril",
      dose: "10 mg tablet",
      instructions: null,
      status: "continue",
      as_needed: false,
      times_per_day: 1,
      times_of_day: ["morning"],
      duration_days: null,
      source_quote: "Take 1 tablet once a day in the morning.",
    },
    {
      name: "Acetaminophen",
      dose: "500 mg tablet",
      instructions: "only if needed for fever or pain",
      status: null,
      as_needed: true,
      times_per_day: null,
      times_of_day: [],
      duration_days: null,
      source_quote: "every 6 hours only if needed for fever or pain",
    },
    {
      name: "Ibuprofen",
      dose: null,
      instructions: "until your doctor says it is safe",
      status: "stop",
      as_needed: false,
      times_per_day: null,
      times_of_day: [],
      duration_days: null,
      source_quote: "STOP taking ibuprofen (Advil, Motrin)",
    },
  ],
  appointments: [
    {
      title: "Primary care doctor",
      date_iso: null,
      days_after_discharge: 7,
      notes: "Bring this paper and all pill bottles",
      source_quote: "See your primary care doctor in 7 days.",
    },
    {
      title: "Chest X-ray",
      date_iso: null,
      days_after_discharge: null,
      notes: "Call radiology to schedule",
      source_quote: "Chest X-ray in 6 weeks",
    },
  ],
  restrictions: [{ text: "Rest at home for the first 3 days", source_quote: "Rest at home for the first 3 days" }],
  warning_signs: [
    { text: "Fever above 101 F for more than 2 days", source_quote: "Fever above 101 F that lasts more than 2 days" },
  ],
  questions_for_doctor: [
    { text: "When is it safe to restart ibuprofen?", based_on_quote: "until your doctor says it is safe" },
  ],
};

export const SAMPLE_TEXT = SAMPLE_DISCHARGE_TEXT;
