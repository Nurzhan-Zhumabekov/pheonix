import type { BillDraft } from "./bill-draft";
import { formatUsdCents, parseUsdCents } from "./bill-money";
import { isIsoDate } from "./dates";

export const pasteFieldLabels = {
  visitDate: "Date of visit",
  eobDate: "EOB issue date",
  responsibility: "Patient responsibility",
  statementDate: "Statement issue date",
  balance: "Statement balance",
};

type PasteField = keyof typeof pasteFieldLabels;
type ParsedReceipt = { amount: string; paidOn: string; postedOn: string };
export interface BillPastePreview {
  fields: Partial<Pick<BillDraft, PasteField>>;
  receipt?: ParsedReceipt;
  notes: string[];
}

export function isDifferentVisit(openVisit: string, pastedVisit: string | undefined): boolean {
  return Boolean(openVisit && pastedVisit && openVisit !== pastedVisit);
}

const dateToken = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})(?![\w/-])/;
const moneyToken = /(?:USD\s*|\$\s*)?(\d+(?:,\d+)*(?:\.\d+)?)(?![\w/-]|[.,]\d)/;
const separator = /\s*(?::|=)?\s*/;

function readValues(text: string, label: RegExp, value: RegExp): string[] {
  const pattern = new RegExp(label.source + separator.source + value.source, "gi");
  return Array.from(text.matchAll(pattern), match => match[1]);
}

function isoDate(raw: string): string | null {
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  const iso = us ? [us[3], us[1].padStart(2, "0"), us[2].padStart(2, "0")].join("-") : raw;
  return isIsoDate(iso) ? iso : null;
}

function dollars(raw: string): string | null {
  const cents = parseUsdCents(raw);
  return cents === null ? null : formatUsdCents(cents).replace(/[$,]/g, "");
}

/** Only import amounts and dates attached to recognized labels. Leave unmatched fields editable. */
export function parseBillText(text: string): BillPastePreview {
  const preview: BillPastePreview = { fields: {}, notes: [] };
  function single(label: string, values: string[], normalize: (raw: string) => string | null) {
    const unique = [...new Set(values.map(normalize))];
    if (!unique.length) return undefined;
    if (unique.length === 1 && unique[0] !== null) return unique[0];
    preview.notes.push("Check " + label + " manually. The pasted values are invalid or differ.");
    return undefined;
  }

  const visits = readValues(text, /\b(?:date of service|service date|date of visit|visit(?: date)?)(?:\s+on)?/, dateToken);
  const visit = single("the visit date", visits, isoDate);
  if (visits.length && !visit) return preview;
  if (visit) preview.fields.visitDate = visit;

  function field(key: PasteField, values: string[], normalize: (raw: string) => string | null) {
    const result = single(pasteFieldLabels[key].toLowerCase(), values, normalize);
    if (result !== undefined) preview.fields[key] = result;
  }
  field("eobDate", readValues(text, /\bEOB\s+(?:issue date|date|dated|issued(?: on)?)/, dateToken), isoDate);
  field("responsibility", readValues(text, /\b(?:patient responsibility|patient share|what you owe)/, moneyToken), dollars);
  field("balance", readValues(text, /\b(?:statement balance(?: due)?|balance due|amount due)/, moneyToken), dollars);
  const statementDates = readValues(text, /\bstatement\s+(?:issue date|date|dated|issued(?: on)?)/, dateToken);
  // "statement balance $600 on May 10" refers to this statement. A due date is a separate field.
  const datedStatement = /\bstatement balance(?: due)?\s*[:=]?\s*(?:USD\s*|\$\s*)?[\d,.]+\s+(?:on|dated|issued(?: on)?)/;
  field("statementDate", [...statementDates, ...readValues(text, datedStatement, dateToken)], isoDate);

  const receiptClauses = text.split(/[\n;]|,\s*(?=[a-z])/i).map(clause => clause.trim())
    .filter(clause => /^(?:(?:i |you |patient )?paid|payment (?:posted|received)|copay paid|receipt amount)\b/i.test(clause));
  if (receiptClauses.length > 1 || receiptClauses.some(clause =>
    /\b(?:and|then)\s+(?:(?:i|you|patient|insurance|insurer|plan)\s+)?(?:paid|payment|copay|receipt)\b/i.test(clause))) {
    preview.notes.push("Several payment entries were found. Add the receipts individually.");
    return preview;
  }
  if (receiptClauses.length === 1) {
    const clause = receiptClauses[0];
    const amount = single("the receipt amount", readValues(clause, /^(?:(?:i |you |patient )?paid|payment (?:posted|received)|copay paid|receipt amount)/, moneyToken), dollars);
    if (amount !== undefined) {
      const postedDates = readValues(clause, /\bposted(?:\s+on|\s+date)?/, dateToken);
      const datedAmount = /(?:USD\s*|\$\s*)?[\d,.]+\s+on/;
      const datesAfterAmount = readValues(clause, datedAmount, dateToken);
      const reportedPosted = /^payment posted\b/i.test(clause);
      const postedOn = single("the posting date", reportedPosted ? [...postedDates, ...datesAfterAmount] : postedDates, isoDate);
      const paidOn = reportedPosted ? undefined : single("the payment date", datesAfterAmount, isoDate);
      preview.receipt = { amount, postedOn: postedOn ?? "", paidOn: paidOn ?? "" };
    }
  }
  return preview;
}

export function applyBillPaste(draft: BillDraft, preview: BillPastePreview, confirmPosting: boolean): Partial<BillDraft> {
  const patch: Partial<BillDraft> = { ...preview.fields };
  const receipt = preview.receipt;
  if (!receipt) return patch;

  const postedOn = receipt.postedOn || (confirmPosting ? receipt.paidOn : "");
  const id = ["pasted", receipt.amount, receipt.paidOn, receipt.postedOn].join("-");
  const payments = isDifferentVisit(draft.visitDate, preview.fields.visitDate) ? [] : draft.payments;
  const existing = payments.find(payment => payment.id === id);
  if (existing) {
    if (!existing.postedOn && postedOn) {
      patch.payments = payments.map(payment => payment.id === id ? { ...payment, postedOn } : payment);
    }
  } else if (!postedOn || !payments.some(payment =>
    payment.postedOn === postedOn && parseUsdCents(payment.amount) === parseUsdCents(receipt.amount))) {
    patch.payments = [...payments, { id, amount: receipt.amount, postedOn, allocation: "unknown" }];
  }
  return patch;
}
