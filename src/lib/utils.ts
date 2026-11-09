import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Currency with paise, for statements where per-entry amounts must add up. */
export function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** All user-facing dates are shown in Indian Standard Time. */
export const APP_TIME_ZONE = "Asia/Kolkata";

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

export function formatMonthYear(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

/** Whole calendar days from `date` to `now`, in India time (0 = same day). */
export function daysSince(date: Date | string, now: Date = new Date()): number {
  const key = (d: Date | string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(new Date(d));
  return Math.round((Date.parse(key(now)) - Date.parse(key(date))) / 86_400_000);
}

/** "Sat, 7 Nov": the weekday matters when checking a duty or journey against a roster. */
export function formatDayWithWeekday(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function eachDayInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  if (cursor > last) return days;
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function getFinancialYearStart(year?: number): Date {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const fyStart = new Date(y, 3, 1);
  if (now < fyStart && !year) {
    return new Date(y - 1, 3, 1);
  }
  return fyStart;
}
