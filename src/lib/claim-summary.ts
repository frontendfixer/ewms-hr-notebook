// Pure claim/settlement maths. No database imports, so it can be unit tested.
//
// A "settlement" is one monthly bill: all of a month's night-duty entries (or
// all its travel entries). Its status is replayed from the steps recorded under
// it; what it is worth comes from the entries attached to it.
import { ClaimStatus, WorkEventType } from "@/generated/prisma/client";
import { statusFromEvents } from "@/lib/claim-status";
import { daysSince, formatDate } from "@/lib/utils";

export type SettlementDomain = "NIGHT_DUTY" | "TRAVEL";

export type SettlementPayment = {
  at: Date;
  /** Null on payments recorded before amounts were stored. */
  amount: number | null;
  reference?: string;
};

export type SettlementView = {
  id: string;
  title: string;
  domain: SettlementDomain;
  year: number;
  month: number;
  status: ClaimStatus;
  total: number;
  paid: number;
  /** Claimed minus received, never below zero. */
  outstanding: number;
  /** Paid in full status but less than claimed. */
  shortPaid: number;
  entryCount: number;
  firstEntry: Date | null;
  lastEntry: Date | null;
  bill: { number?: string; at: Date } | null;
  passedAt: Date | null;
  payments: SettlementPayment[];
};

type RawEvent = {
  id: string;
  eventType: string;
  payload: unknown;
  recordedAt: Date;
  occurredAt: Date;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Builds the view of one settlement from its own event, the status steps under
 * it, and the entries attached to it. Same rules the single-settlement summary
 * used: payments recorded without an amount count as the full total.
 */
export function buildSettlementView(input: {
  settlement: RawEvent & { title: string; domain: string };
  /** Bill / passed / payment / status-change events under the settlement, any order. */
  steps: RawEvent[];
  /** Night-duty and travel entries attached to the settlement. */
  claims: { occurredAt: Date; payload: unknown }[];
}): SettlementView {
  const { settlement } = input;
  const steps = [...input.steps].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );
  const status = statusFromEvents(settlement.id, [
    {
      id: settlement.id,
      eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
      payload: settlement.payload,
      recordedAt: settlement.recordedAt,
    },
    ...steps.map((s) => ({
      id: s.id,
      eventType: s.eventType as WorkEventType,
      payload: s.payload,
      recordedAt: s.recordedAt,
    })),
  ]);

  const total = round2(
    input.claims.reduce((sum, c) => sum + ((c.payload as { amount?: number }).amount ?? 0), 0),
  );

  const payments: SettlementPayment[] = steps
    .filter((s) => s.eventType === WorkEventType.PAYMENT_RECEIVED)
    .map((s) => {
      const p = s.payload as { amount?: number; paymentReference?: string };
      return { at: s.occurredAt, amount: p.amount ?? null, reference: p.paymentReference };
    });
  const legacyPayment = payments.some((p) => p.amount == null);
  const paid =
    status === ClaimStatus.VOIDED ? 0 : legacyPayment ? total : round2(payments.reduce((s, p) => s + (p.amount ?? 0), 0));
  const outstanding =
    status === ClaimStatus.VOIDED ? 0 : Math.max(0, round2(total - paid));

  const lastOf = (type: WorkEventType) =>
    [...steps].reverse().find((s) => s.eventType === type);
  const bill = lastOf(WorkEventType.BILL_SUBMITTED);
  const passed = lastOf(WorkEventType.CLAIM_PASSED);
  const dates = input.claims.map((c) => c.occurredAt.getTime());
  const { year, month } = settlement.payload as { year: number; month: number };

  return {
    id: settlement.id,
    title: settlement.title,
    domain: settlement.domain as SettlementDomain,
    year,
    month,
    status,
    total,
    paid,
    outstanding,
    shortPaid: status === ClaimStatus.PAID ? outstanding : 0,
    entryCount: input.claims.length,
    firstEntry: dates.length ? new Date(Math.min(...dates)) : null,
    lastEntry: dates.length ? new Date(Math.max(...dates)) : null,
    bill: bill
      ? { number: (bill.payload as { billNumber?: string }).billNumber, at: bill.occurredAt }
      : null,
    passedAt: passed?.occurredAt ?? null,
    payments,
  };
}

/** True while there is still something to chase: unpaid, or paid short. */
export function isOpen(view: SettlementView): boolean {
  return (
    view.status !== ClaimStatus.VOIDED &&
    view.entryCount > 0 &&
    (view.status !== ClaimStatus.PAID || view.shortPaid > 0)
  );
}

export type ClaimsFilter = "open" | "paid" | "all";

export function parseClaimsFilter(value: string | undefined): ClaimsFilter {
  return value === "paid" || value === "all" ? value : "open";
}

export function filterViews(views: SettlementView[], filter: ClaimsFilter): SettlementView[] {
  const listed = views.filter((v) => v.entryCount > 0 && v.status !== ClaimStatus.VOIDED);
  if (filter === "all") return listed;
  if (filter === "paid") return listed.filter((v) => !isOpen(v));
  return listed.filter(isOpen);
}

export type MonthGroup = {
  year: number;
  month: number;
  views: SettlementView[];
  total: number;
  paid: number;
  outstanding: number;
};

/** Night duty and travel bills of the same month together, newest month first. */
export function groupByMonth(views: SettlementView[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const v of views) {
    const key = `${v.year}-${String(v.month).padStart(2, "0")}`;
    const g = groups.get(key) ?? {
      year: v.year,
      month: v.month,
      views: [],
      total: 0,
      paid: 0,
      outstanding: 0,
    };
    g.views.push(v);
    g.total = round2(g.total + v.total);
    g.paid = round2(g.paid + v.paid);
    g.outstanding = round2(g.outstanding + v.outstanding);
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month))
    .map((g) => ({
      ...g,
      // Night duty before travel, the order the rest of the app uses.
      views: g.views.sort((a, b) => (a.domain === b.domain ? 0 : a.domain === "NIGHT_DUTY" ? -1 : 1)),
    }));
}

export type Stage = "DRAFT" | "BILL_SUBMITTED" | "PASSED" | "SHORT_PAID";

export type ClaimsOverview = {
  /** Everything still to be received. */
  due: number;
  openBills: number;
  /** What is owed, by where it is stuck. */
  stages: Record<Stage, { amount: number; count: number }>;
  year: number;
  yearClaimed: number;
  yearReceived: number;
  yearEntries: number;
  nightDuty: { amount: number; count: number };
  travel: { amount: number; count: number };
};

export function buildOverview(views: SettlementView[], year: number): ClaimsOverview {
  const stages: ClaimsOverview["stages"] = {
    DRAFT: { amount: 0, count: 0 },
    BILL_SUBMITTED: { amount: 0, count: 0 },
    PASSED: { amount: 0, count: 0 },
    SHORT_PAID: { amount: 0, count: 0 },
  };
  let due = 0;
  let openBills = 0;
  let yearClaimed = 0;
  let yearReceived = 0;
  let yearEntries = 0;
  const nightDuty = { amount: 0, count: 0 };
  const travel = { amount: 0, count: 0 };

  for (const v of views) {
    if (v.entryCount === 0 || v.status === ClaimStatus.VOIDED) continue;
    if (v.outstanding > 0) {
      const stage: Stage =
        v.status === ClaimStatus.PAID
          ? "SHORT_PAID"
          : (v.status as Exclude<Stage, "SHORT_PAID">);
      stages[stage].amount = round2(stages[stage].amount + v.outstanding);
      stages[stage].count++;
      due = round2(due + v.outstanding);
    }
    if (isOpen(v)) openBills++;
    if (v.year === year) {
      yearClaimed = round2(yearClaimed + v.total);
      yearReceived = round2(yearReceived + v.paid);
      yearEntries += v.entryCount;
      const seg = v.domain === "TRAVEL" ? travel : nightDuty;
      seg.amount = round2(seg.amount + v.total);
      seg.count += v.entryCount;
    }
  }
  return { due, openBills, stages, year, yearClaimed, yearReceived, yearEntries, nightDuty, travel };
}

/** Which step the user is waiting on, and for how long, e.g. "Billed 12 days ago". */
export function waitingNote(view: SettlementView, now: Date = new Date()): string | null {
  const ago = (d: Date) => {
    const n = Math.max(0, daysSince(d, now));
    return n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
  };
  if (view.status === ClaimStatus.BILL_SUBMITTED && view.bill) return `Billed ${ago(view.bill.at)}`;
  if (view.status === ClaimStatus.PASSED && view.passedAt) return `Passed ${ago(view.passedAt)}`;
  return null;
}

/** Date and note for each step of the stepper on the detail page. */
export function stepDetails(
  view: SettlementView,
): Partial<Record<ClaimStatus, { date?: string; note?: string }>> {
  const details: Partial<Record<ClaimStatus, { date?: string; note?: string }>> = {};
  if (view.bill) {
    details.BILL_SUBMITTED = {
      date: formatDate(view.bill.at),
      note: view.bill.number ? `Bill ${view.bill.number}` : undefined,
    };
  }
  if (view.passedAt) details.PASSED = { date: formatDate(view.passedAt) };
  const last = view.payments.at(-1);
  if (last) {
    const received = view.payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const notes = [
      view.payments.some((p) => p.amount != null) ? `₹${received.toLocaleString("en-IN")} received` : null,
      last.reference ?? null,
    ].filter(Boolean);
    details.PAID = { date: formatDate(last.at), note: notes.join(" · ") || undefined };
  }
  return details;
}
