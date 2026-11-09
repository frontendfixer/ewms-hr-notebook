// Pure helpers for the reports page. No database imports, so they can be unit tested.
import type { ReportMonth } from "@/lib/report-types";

export function shiftMonth({ year, month }: ReportMonth, delta: number): ReportMonth {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const longMonth = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortMonth = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "November 2026". Built from year and month alone, so no timezone can shift it. */
export function monthLabel({ year, month }: ReportMonth): string {
  return longMonth.format(new Date(Date.UTC(year, month - 1, 1)));
}

export function shortMonthLabel({ year, month }: ReportMonth): string {
  return shortMonth.format(new Date(Date.UTC(year, month - 1, 1)));
}

export function isSameMonth(a: ReportMonth, b: ReportMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

type SettlementLike = { paid: number; outstanding: number; total: number; status: string } | null;

/**
 * Money status across a month's night-duty and travel claims. Entries join a
 * monthly bill as soon as they are saved, and that bill starts as a draft, so
 * a draft (or no bill) means "not billed yet", not "due".
 */
export function rollUpClaims(
  claims: { total: number; settlement: SettlementLike }[],
) {
  let unbilled = 0;
  let paid = 0;
  let outstanding = 0;
  let shortPaid = false;
  let withClaims = 0;
  let settled = 0;
  for (const { total, settlement } of claims) {
    if (total <= 0) continue;
    withClaims++;
    if (!settlement || settlement.status === "DRAFT" || settlement.status === "VOIDED") {
      unbilled += total;
      continue;
    }
    paid += settlement.paid;
    outstanding += settlement.outstanding;
    if (settlement.status === "PAID" && settlement.outstanding > 0) shortPaid = true;
    if (settlement.status === "PAID" && settlement.outstanding <= 0) settled++;
  }
  return {
    unbilled: round2(unbilled),
    paid: round2(paid),
    outstanding: round2(outstanding),
    shortPaid,
    billed: paid > 0 || outstanding > 0,
    /** Every claim in the month has been billed and paid in full. */
    allPaid: withClaims > 0 && settled === withClaims,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Change against the previous month, or null when there is nothing to compare. */
export function monthDelta(current: number, previous: number) {
  if (previous <= 0 && current <= 0) return null;
  const diff = Math.round((current - previous) * 100) / 100;
  if (diff === 0) return { diff: 0, direction: "same" as const };
  return { diff: Math.abs(diff), direction: diff > 0 ? ("up" as const) : ("down" as const) };
}

/** Bar heights as whole percentages of the tallest, with a floor so a zero month still shows a tick. */
export function barPercents(values: number[], floor = 4): number[] {
  const max = Math.max(0, ...values);
  if (max <= 0) return values.map(() => floor);
  return values.map((v) => (v <= 0 ? floor : Math.max(floor, Math.round((v / max) * 100))));
}

/** Share of the whole taken by `part`, 0–100. */
export function sharePercent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** `yyyy-MM` the app should treat as "this month": the calendar in India, not the UTC server clock. */
export function currentReportMonth(now = new Date()): ReportMonth {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === "year")!.value),
    month: Number(parts.find((p) => p.type === "month")!.value),
  };
}

/** Parse `yyyy-MM`; anything else means the current month. */
export function parseReportMonth(value: string | undefined, now = new Date()): ReportMonth {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  if (match) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year: Number(match[1]), month };
  }
  return currentReportMonth(now);
}

export function reportMonthKey({ year, month }: ReportMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Indian financial year (April–March) containing the given month. */
export function financialYearOf({ year, month }: ReportMonth) {
  const startYear = month >= 4 ? year : year - 1;
  return {
    label: `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`,
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 2, 31, 23, 59, 59, 999),
  };
}

/**
 * Money per month for a financial year, April first. Entries outside the year
 * are ignored; months are read the same way the monthly statement reads them
 * (server calendar), so the chart agrees with the statement for each month.
 */
export function fyMonthSeries(
  startYear: number,
  entries: { occurredAt: Date; amount: number }[],
): { year: number; month: number; amount: number }[] {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(startYear, 3 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, amount: 0 };
  });
  for (const e of entries) {
    const slot = months.find(
      (m) => m.year === e.occurredAt.getFullYear() && m.month === e.occurredAt.getMonth() + 1,
    );
    if (slot) slot.amount = round2(slot.amount + e.amount);
  }
  return months;
}
