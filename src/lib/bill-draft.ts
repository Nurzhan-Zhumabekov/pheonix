import { createBillSample, type DemoScenario } from "../samples/bill-sample";
import { formatUsdCents, parseUsdCents } from "./bill-money";
import type { BillEob, BillInput, BillPayment, BillStatement, CallRecord, NextStatementInput } from "./bill-types";

export interface PaymentDraft {
  id: string;
  amount: string;
  postedOn: string;
  allocation: BillPayment["allocation"];
}

export interface BillDraft {
  visitDate: string;
  sameVisit: boolean;
  eobStatus: BillEob["status"];
  eobDate: string;
  responsibility: string;
  statementScope: BillStatement["scope"];
  statementDate: string;
  balance: string;
  paymentsKnown: boolean;
  payments: PaymentDraft[];
}

export interface CallDraft {
  calledOn: string;
  promisedBalance: string;
  followUpOn: string;
}

export interface NextDraft {
  sameVisit: boolean;
  statementScope: BillStatement["scope"];
  statementDate: string;
  balance: string;
  sameDayRevision: boolean;
  editEob: boolean;
  eobStatus: BillEob["status"];
  eobDate: string;
  responsibility: string;
  editPayments: boolean;
  paymentsKnown: boolean;
  payments: PaymentDraft[];
}

export function emptyBillDraft(): BillDraft {
  return {
    visitDate: "", sameVisit: false, eobStatus: "unknown", eobDate: "", responsibility: "",
    statementScope: "unknown", statementDate: "", balance: "", paymentsKnown: false, payments: [],
  };
}

export function emptyCallDraft(): CallDraft {
  return { calledOn: "", promisedBalance: "", followUpOn: "" };
}

export function emptyNextDraft(): NextDraft {
  return {
    sameVisit: false, statementScope: "unknown", statementDate: "", balance: "", sameDayRevision: false,
    editEob: false, eobStatus: "unknown", eobDate: "", responsibility: "",
    editPayments: false, paymentsKnown: false, payments: [],
  };
}

function dateOrNull(value: string): string | null {
  return value.trim() || null;
}

function toEob(draft: Pick<BillDraft, "eobStatus" | "eobDate" | "responsibility">): BillEob {
  return {
    status: draft.eobStatus,
    issuedOn: dateOrNull(draft.eobDate),
    patientResponsibilityCents: parseUsdCents(draft.responsibility),
  };
}

function toStatement(draft: Pick<BillDraft, "statementScope" | "statementDate" | "balance">): BillStatement {
  return {
    scope: draft.statementScope,
    issuedOn: dateOrNull(draft.statementDate),
    balanceCents: parseUsdCents(draft.balance),
  };
}

function toPayments(draft: Pick<BillDraft, "paymentsKnown" | "payments">): BillPayment[] | null {
  if (!draft.paymentsKnown) return null;
  return draft.payments.map(payment => ({
    id: payment.id,
    amountCents: parseUsdCents(payment.amount),
    postedOn: dateOrNull(payment.postedOn),
    allocation: payment.allocation,
  }));
}

export function toBillInput(draft: BillDraft): BillInput {
  return {
    visitDate: dateOrNull(draft.visitDate),
    sameVisit: draft.sameVisit,
    eob: toEob(draft),
    statement: toStatement(draft),
    payments: toPayments(draft),
  };
}

export function toCallRecord(draft: CallDraft): CallRecord | null {
  const calledOn = dateOrNull(draft.calledOn);
  const followUpOn = dateOrNull(draft.followUpOn);
  if (calledOn === null && followUpOn === null && draft.promisedBalance.trim() === "") return null;
  return { calledOn, promisedBalanceCents: parseUsdCents(draft.promisedBalance), followUpOn };
}

export function toNextStatementInput(draft: NextDraft): NextStatementInput {
  return {
    sameVisit: draft.sameVisit,
    statement: toStatement(draft),
    ...(draft.sameDayRevision ? { confirmedSameDayRevision: true } : {}),
    ...(draft.editEob ? { eob: toEob(draft) } : {}),
    ...(draft.editPayments ? { payments: toPayments(draft) } : {}),
  };
}

function amountText(cents: number | null): string {
  return cents === null ? "" : formatUsdCents(cents).replace(/[$,]/g, "");
}

function eobDraft(eob: BillEob): Pick<BillDraft, "eobStatus" | "eobDate" | "responsibility"> {
  return {
    eobStatus: eob.status,
    eobDate: eob.issuedOn ?? "",
    responsibility: amountText(eob.patientResponsibilityCents),
  };
}

function statementDraft(statement: BillStatement): Pick<BillDraft, "statementScope" | "statementDate" | "balance"> {
  return {
    statementScope: statement.scope,
    statementDate: statement.issuedOn ?? "",
    balance: amountText(statement.balanceCents),
  };
}

function paymentDrafts(payments: BillPayment[] | null): Pick<BillDraft, "paymentsKnown" | "payments"> {
  return {
    paymentsKnown: payments !== null,
    payments: (payments ?? []).map(payment => ({
      id: payment.id,
      amount: amountText(payment.amountCents),
      postedOn: payment.postedOn ?? "",
      allocation: payment.allocation,
    })),
  };
}

export function sampleDrafts(scenario: DemoScenario = "copay"): { first: BillDraft; call: CallDraft; next: NextDraft } {
  const { first, call, next } = createBillSample(scenario);
  return {
    first: {
      visitDate: first.visitDate ?? "", sameVisit: first.sameVisit === true,
      ...eobDraft(first.eob), ...statementDraft(first.statement), ...paymentDrafts(first.payments),
    },
    call: {
      calledOn: call.calledOn ?? "", promisedBalance: amountText(call.promisedBalanceCents), followUpOn: call.followUpOn ?? "",
    },
    next: {
      sameVisit: next.sameVisit === true, sameDayRevision: next.confirmedSameDayRevision === true,
      editEob: next.eob !== undefined, editPayments: next.payments !== undefined,
      ...statementDraft(next.statement), ...eobDraft(next.eob ?? first.eob),
      ...paymentDrafts(next.payments === undefined ? first.payments : next.payments),
    },
  };
}
