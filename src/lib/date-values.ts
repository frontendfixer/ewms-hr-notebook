import { format, parse } from "date-fns";

const VALUE_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "d MMM yyyy";

/** Parse `yyyy-MM-dd` as local calendar date (no UTC shift). */
export function parseLocalDateValue(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, VALUE_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatLocalDateValue(date: Date | undefined): string {
  if (!date) return "";
  return format(date, VALUE_FORMAT);
}

export function formatDisplayDate(date: Date | undefined): string {
  if (!date) return "";
  return format(date, DISPLAY_FORMAT);
}

export function formatDisplayDateRange(
  from: Date | undefined,
  to: Date | undefined,
): string {
  if (!from) return "";
  if (!to || from.getTime() === to.getTime()) {
    return formatDisplayDate(from);
  }
  return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
}
