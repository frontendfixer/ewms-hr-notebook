/**
 * Allowance rules for Indian Railways non-gazetted staff (7th CPC).
 *
 * Sources (verify against the original Railway Board PDFs when rules change):
 * - NDA: RBE 36/2018 (hourly rate, 10-minute weightage), RBE 83/2020 (₹43,600
 *   basic pay ceiling), RBE 85/2022 (eligible up to Pay Level 7, incl. MACP L8).
 * - DA rates: Ministry of Finance OMs; 60% w.e.f. 01.01.2026 (OM 22.04.2026).
 * - Daily allowance on tour: RBE 84/2017 rates, +25% each time DA crosses a
 *   multiple of 50% (RBE 51/2024 rates w.e.f. 01.01.2024).
 */

/** Night window for NDA: 22:00 – 06:00. */
export const NDA_WINDOW_START_MINUTES = 22 * 60;
export const NDA_WINDOW_END_MINUTES = 6 * 60;

/** Weightage credited (and paid) for every hour of duty inside the night window. */
export const NDA_WEIGHTAGE_MINUTES_PER_HOUR = 10;

/** Maximum basic pay used to work out the NDA hourly rate (RBE 83/2020, 85/2022). */
export const NDA_BASIC_PAY_CEILING = 43600;

/** Highest pay level eligible for NDA (RBE 85/2022; MACP to Level 8 also eligible). */
export const NDA_MAX_PAY_LEVEL = 7;

export const DEFAULT_NIGHT_DUTY_START = "22:00";
export const DEFAULT_NIGHT_DUTY_END = "06:00";

/** Official DA % (7th CPC) by effective date. Add a row when a new OM is issued. */
export const DA_RATE_HISTORY: ReadonlyArray<{ from: string; percent: number }> = [
  { from: "2021-07-01", percent: 31 },
  { from: "2022-01-01", percent: 34 },
  { from: "2022-07-01", percent: 38 },
  { from: "2023-01-01", percent: 42 },
  { from: "2023-07-01", percent: 46 },
  { from: "2024-01-01", percent: 50 },
  { from: "2024-07-01", percent: 53 },
  { from: "2025-01-01", percent: 55 },
  { from: "2025-07-01", percent: 58 },
  { from: "2026-01-01", percent: 60 },
];

/** 7th CPC daily allowance (₹/day) before DA-linked increases, by pay level band. */
const DAILY_ALLOWANCE_BASE: ReadonlyArray<{ minLevel: number; amount: number }> = [
  { minLevel: 14, amount: 1200 },
  { minLevel: 12, amount: 1000 },
  { minLevel: 9, amount: 900 },
  { minLevel: 6, amount: 800 },
  { minLevel: 1, amount: 500 },
];

/** Share of the full daily allowance by hours absent from headquarters in a calendar day. */
export const DAILY_ALLOWANCE_SLABS: ReadonlyArray<{ maxHours: number; percent: number }> = [
  { maxHours: 6, percent: 30 },
  { maxHours: 12, percent: 70 },
  { maxHours: 24, percent: 100 },
];

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Official DA % in force on `date`, or null if the date predates the table. */
export function officialDaPercentOn(date: Date): number | null {
  const key = dateKey(date);
  let percent: number | null = null;
  for (const row of DA_RATE_HISTORY) {
    if (row.from <= key) percent = row.percent;
  }
  return percent;
}

/** DA % to use on `date`: the user's override when set, else the official rate. */
export function daPercentOn(date: Date, override?: number | null): number {
  if (override != null && Number.isFinite(override)) return override;
  return officialDaPercentOn(date) ?? DA_RATE_HISTORY[0].percent;
}

export function dearnessAllowanceFromPercent(
  basicPay: number,
  daPercent: number,
): number {
  return roundMoney((basicPay * daPercent) / 100);
}

/** Basic pay after applying the NDA ceiling. */
export function ndaBasicPay(basicPay: number): number {
  return Math.min(basicPay, NDA_BASIC_PAY_CEILING);
}

/** NDA hourly rate: (Basic Pay + DA) / 200, with basic pay capped at the ceiling. */
export function ndaHourlyRate(basicPay: number, daPercent: number): number {
  const basic = ndaBasicPay(basicPay);
  return roundMoney((basic + dearnessAllowanceFromPercent(basic, daPercent)) / 200);
}

export function isNdaEligibleLevel(payLevel: number | null | undefined): boolean {
  return payLevel == null || payLevel <= NDA_MAX_PAY_LEVEL;
}

/** Parse "HH:MM" into minutes after midnight, or null when invalid. */
export function parseTimeToMinutes(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Minutes of a duty spell that fall inside 22:00–06:00.
 * The spell starts on the duty date; an end time at or before the start
 * time means the spell ends the next day.
 */
export function nightWindowMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const endRaw = parseTimeToMinutes(endTime);
  if (start == null || endRaw == null) return 0;
  const end = endRaw <= start ? endRaw + 24 * 60 : endRaw;

  // Night windows that can overlap a spell starting on day 0: previous night
  // (00:00–06:00), tonight (22:00–30:00) and tomorrow night (46:00–54:00).
  const windows: Array<[number, number]> = [
    [0, NDA_WINDOW_END_MINUTES],
    [NDA_WINDOW_START_MINUTES, 24 * 60 + NDA_WINDOW_END_MINUTES],
    [24 * 60 + NDA_WINDOW_START_MINUTES, 48 * 60 + NDA_WINDOW_END_MINUTES],
  ];
  return windows.reduce(
    (sum, [ws, we]) => sum + Math.max(0, Math.min(end, we) - Math.max(start, ws)),
    0,
  );
}

/** Paid NDA hours = 10 minutes for every hour worked inside the night window. */
export function ndaWeightageHours(nightMinutes: number): number {
  return (nightMinutes / 60) * (NDA_WEIGHTAGE_MINUTES_PER_HOUR / 60);
}

export type NdaBreakdown = {
  nightMinutes: number;
  weightageHours: number;
  hourlyRate: number;
  ndaBasicPay: number;
  daPercent: number;
  amount: number;
};

export function calculateNda(
  basicPay: number,
  daPercent: number,
  startTime: string = DEFAULT_NIGHT_DUTY_START,
  endTime: string = DEFAULT_NIGHT_DUTY_END,
): NdaBreakdown {
  const nightMinutes = nightWindowMinutes(startTime, endTime);
  const weightageHours = ndaWeightageHours(nightMinutes);
  const hourlyRate = ndaHourlyRate(basicPay, daPercent);
  return {
    nightMinutes,
    weightageHours: Math.round(weightageHours * 10000) / 10000,
    hourlyRate,
    ndaBasicPay: ndaBasicPay(basicPay),
    daPercent,
    amount: roundMoney(weightageHours * hourlyRate),
  };
}

/** Full daily allowance rate (₹/day) for a pay level at the given DA %. */
export function dailyAllowanceRate(payLevel: number, daPercent: number): number {
  const band =
    DAILY_ALLOWANCE_BASE.find((b) => payLevel >= b.minLevel) ??
    DAILY_ALLOWANCE_BASE[DAILY_ALLOWANCE_BASE.length - 1];
  const steps = Math.floor(daPercent / 50);
  return Math.round(band.amount * (1 + 0.25 * steps));
}

/** Full daily allowance on `date`, honouring the user's overrides. */
export function taRateFor(
  pay: {
    payLevel: number | null;
    taRateOverride: number | null;
    daPercentOverride: number | null;
  },
  date: Date,
): number {
  if (pay.taRateOverride != null) return pay.taRateOverride;
  return dailyAllowanceRate(pay.payLevel ?? 1, daPercentOn(date, pay.daPercentOverride));
}

export function dailyAllowanceSlabPercent(hoursAbsent: number): number {
  if (hoursAbsent <= 0) return 0;
  for (const slab of DAILY_ALLOWANCE_SLABS) {
    if (hoursAbsent <= slab.maxHours) return slab.percent;
  }
  return 100;
}

export type TourDay = { date: string; hours: number; percent: number };

/**
 * Split an absence from headquarters into calendar days (midnight to midnight)
 * and apply the hours-absent slab to each day.
 */
export function tourDaySlabs(departure: Date, arrival: Date): TourDay[] {
  if (!(arrival > departure)) return [];
  const days: TourDay[] = [];
  let cursor = new Date(departure);
  while (cursor < arrival) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);
    const sliceEnd = arrival < nextMidnight ? arrival : nextMidnight;
    const hours = (sliceEnd.getTime() - cursor.getTime()) / 3_600_000;
    days.push({
      date: dateKey(cursor),
      hours: Math.round(hours * 100) / 100,
      percent: dailyAllowanceSlabPercent(hours),
    });
    cursor = sliceEnd;
  }
  return days;
}

/** Total daily allowance % across the tour (e.g. 170 = 1 full day + 70%). */
export function tourClaimPercent(departure: Date, arrival: Date): number {
  return tourDaySlabs(departure, arrival).reduce((sum, d) => sum + d.percent, 0);
}

/** TA (daily allowance) for a journey: full daily rate × total claim %. */
export function calculateTaAmount(
  dailyRate: number,
  claimPercent: number,
): number {
  return roundMoney((dailyRate * claimPercent) / 100);
}
