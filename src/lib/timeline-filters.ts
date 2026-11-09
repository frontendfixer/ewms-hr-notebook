// Pure URL/filter logic for the timeline. Client components import this, so it
// must stay free of Prisma runtime imports (they pull Node modules into the browser bundle).
import { APP_TIME_ZONE } from "@/lib/utils";

export const TIMELINE_TYPES = [
  "CR",
  "LEAVE",
  "NIGHT_DUTY",
  "TRAVEL",
  "pending",
] as const;
export type TimelineType = "all" | (typeof TIMELINE_TYPES)[number];
export type TimelinePeriod = "all" | "month" | "year";

export type TimelineFilters = { type: TimelineType; period: TimelinePeriod };

export const TIMELINE_PAGE_SIZE = 100;
export const TIMELINE_MAX_LIMIT = 500;

/**
 * `?filter=` picks the kind of entry and `?period=` the time range, so "Night
 * duty this month" is one URL. Older links put the period in `filter`
 * (`?filter=month`); those still work.
 */
export function parseTimelineFilters(
  filter?: string,
  period?: string,
): TimelineFilters {
  const legacyPeriod = filter === "month" || filter === "year" ? filter : null;
  const type = (TIMELINE_TYPES as readonly string[]).includes(filter ?? "")
    ? (filter as TimelineType)
    : "all";
  const resolved = period === "month" || period === "year" ? period : legacyPeriod;
  return { type, period: resolved ?? "all" };
}

export function timelineHref(
  { type, period }: TimelineFilters,
  limit?: number,
  basePath = "/timeline",
): string {
  const params = new URLSearchParams();
  if (type !== "all") params.set("filter", type);
  if (period !== "all") params.set("period", period);
  if (limit && limit > TIMELINE_PAGE_SIZE) params.set("limit", String(limit));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function parseTimelineLimit(raw?: string): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < TIMELINE_PAGE_SIZE) return TIMELINE_PAGE_SIZE;
  return Math.min(n, TIMELINE_MAX_LIMIT);
}

const istParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
});

/**
 * Whole month or year, so entries planned later in it (booked leave) are
 * included. "Now" is read in India time: just after midnight IST on the 1st
 * the UTC server clock still says the previous month. Dates are stored as
 * server-local midnights, so the bounds are built the same way.
 */
export function getPeriodRange(
  period: TimelinePeriod,
  now = new Date(),
): { from?: Date; to?: Date } {
  if (period === "all") return {};
  const parts = istParts.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value) - 1;
  if (period === "month") {
    return {
      from: new Date(year, month, 1),
      to: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }
  return {
    from: new Date(year, 0, 1),
    to: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

const RECORD_TYPE_TO_FILTER: Record<string, TimelineType> = {
  cr: "CR",
  leave: "LEAVE",
  night: "NIGHT_DUTY",
  ta: "TRAVEL",
};

/**
 * Where an old `/records/<type>?filter=` link goes now that the timeline is
 * the only list: the same entries, with the same filter applied.
 */
export function recordsRedirectHref(type?: string, filter?: string): string {
  const legacy = parseTimelineFilters(filter);
  return timelineHref({
    type: filter === "pending" ? "pending" : (RECORD_TYPE_TO_FILTER[type ?? ""] ?? "all"),
    period: legacy.period,
  });
}
