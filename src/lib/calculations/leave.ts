/**
 * Leave and compensatory-rest (CR) rules that do not touch the database.
 *
 * - CL: 8 days per calendar year (10 for staff not entitled to all public
 *   holidays); unavailed CL lapses on 31 Dec. Sundays and holidays falling
 *   inside a CL spell are not counted.
 * - LAP: 15 days credited in advance on 1 Jan and 1 Jul; accumulation capped
 *   at 300 days. LHAP: 10 days credited on 1 Jan and 1 Jul.
 */

export const DEFAULT_CL_ENTITLEMENT = 8;
export const LAP_HALF_YEARLY_CREDIT = 15;
export const LHAP_HALF_YEARLY_CREDIT = 10;
export const LAP_MAX_ACCUMULATION = 300;

export type LeaveDurationValue = "FULL" | "FIRST_HALF" | "SECOND_HALF";

/** Leave kinds whose spell skips Sundays and holidays when counting days. */
export const HOLIDAY_EXCLUDING_LEAVE = new Set(["CL", "CR"]);

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export { dayKey as leaveDayKey };

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export type LeaveDayCount = {
  days: number;
  calendarDays: number;
  excludedDays: string[];
};

/**
 * Count chargeable leave days. Half-day leave is only valid for a single date.
 * `holidayKeys` holds `yyyy-MM-dd` keys of holidays the user observes.
 */
export function countLeaveDays(
  start: Date,
  end: Date,
  duration: LeaveDurationValue,
  options: { excludeHolidays: boolean; holidayKeys?: Set<string> } = {
    excludeHolidays: false,
  },
): LeaveDayCount {
  const all = eachDay(start, end);
  const excludedDays: string[] = [];
  let counted = 0;
  for (const day of all) {
    const key = dayKey(day);
    if (
      options.excludeHolidays &&
      (day.getDay() === 0 || options.holidayKeys?.has(key))
    ) {
      excludedDays.push(key);
      continue;
    }
    counted++;
  }
  const days = duration === "FULL" ? counted : counted * 0.5;
  return { days, calendarDays: all.length, excludedDays };
}

export function validateLeaveRange(
  start: Date,
  end: Date,
  duration: LeaveDurationValue,
): string | null {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  if (e < s) return "End date must be on or after the start date";
  if (duration !== "FULL" && e.getTime() !== s.getTime()) {
    return "Half-day leave can only be taken for a single date";
  }
  return null;
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export type CrCreditAvailability = {
  creditEventId: string;
  balance: number;
  expiresAt: Date | null;
  earnedAt: Date | null;
};

export type CrAllocation = { creditEventId: string; amount: number };

/**
 * Allocate CR credits to cover `daysNeeded`, oldest expiry first. Only credits
 * earned on or before the leave start and still valid on that date are usable.
 * Selected credits are used first, then the remaining FIFO credits.
 */
export function allocateCrCredits(
  credits: CrCreditAvailability[],
  daysNeeded: number,
  leaveStart: Date,
  preferredIds: string[] = [],
): { allocations: CrAllocation[]; shortfall: number } {
  const usable = credits
    .filter(
      (c) =>
        c.balance > 0 &&
        (!c.expiresAt || c.expiresAt > leaveStart) &&
        (!c.earnedAt || c.earnedAt <= leaveStart),
    )
    .sort((a, b) => {
      const ap = preferredIds.includes(a.creditEventId) ? 0 : 1;
      const bp = preferredIds.includes(b.creditEventId) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const ae = a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const be = b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return ae - be;
    });

  let remaining = daysNeeded;
  const allocations: CrAllocation[] = [];
  for (const credit of usable) {
    if (remaining <= 0) break;
    const amount = Math.min(credit.balance, remaining);
    allocations.push({ creditEventId: credit.creditEventId, amount });
    remaining = Math.round((remaining - amount) * 100) / 100;
  }
  return { allocations, shortfall: Math.max(0, remaining) };
}

export type AccrualKind = "CL_YEAR" | "LAP_HALF" | "LHAP_HALF";

export type AccrualPeriod = {
  kind: AccrualKind;
  /** e.g. "2027" for CL, "2027-H1" for LAP/LHAP. */
  periodKey: string;
  date: Date;
};

/**
 * Accrual dates strictly after `since` and on or before `asOf`:
 * CL resets every 1 Jan; LAP and LHAP are credited every 1 Jan and 1 Jul.
 */
export function dueAccrualPeriods(since: Date, asOf: Date): AccrualPeriod[] {
  const periods: AccrualPeriod[] = [];
  for (let year = since.getFullYear(); year <= asOf.getFullYear(); year++) {
    for (const half of [0, 1] as const) {
      const date = new Date(year, half === 0 ? 0 : 6, 1);
      if (date <= since || date > asOf) continue;
      const halfKey = `${year}-H${half + 1}`;
      if (half === 0) {
        periods.push({ kind: "CL_YEAR", periodKey: String(year), date });
      }
      periods.push({ kind: "LAP_HALF", periodKey: halfKey, date });
      periods.push({ kind: "LHAP_HALF", periodKey: halfKey, date });
    }
  }
  return periods;
}
