import type { EventDomain, LeaveType } from "@/generated/prisma/client";
import { CLAIM_PILL_LABELS, CLAIM_STATUS_LABELS, claimStatusVariant } from "@/lib/design-tokens";
import type { STATUS_COLORS } from "@/lib/design-tokens";
import { formatEventCardDisplay } from "@/lib/event-card-display";
import { LEAVE_TYPE_SHORT_LABELS } from "@/lib/leave-types";
import {
  APP_TIME_ZONE,
  formatCurrency,
  formatDate,
  formatShortDate,
} from "@/lib/utils";

export type SummaryTone = keyof typeof STATUS_COLORS;

/** What a timeline row shows for one entry. Pure data, no markup. */
export type EventSummary = {
  headline: string;
  /** Short facts for the second line, joined with a separator when rendered. */
  meta: string[];
  /** Right-aligned figure: claim amount, leave days, CR earned. */
  value?: string;
  /** Status pill under the figure. */
  pill?: { label: string; tone: SummaryTone };
  /** The user's own remark, shown as a faint third line. */
  note?: string;
  /** Fades the row (a CR credit that has been spent). */
  muted?: boolean;
  /** Date tile on the left: day number and weekday, in India time. */
  tile: { day: string; weekday: string };
};

export type SummaryEvent = {
  domain: EventDomain;
  eventType: string;
  title: string;
  occurredAt: Date;
  remarks?: string | null;
  payload: unknown;
};

export type SummaryContext = {
  /** Claim status for night duty and travel entries. */
  claimStatus?: string | null;
  /** How much of this CR credit leave has used, and when the first leave started. */
  crUsage?: { appliedAt: Date; used: number } | null;
  /** Injected for tests; defaults to now. */
  now?: Date;
};

type Payload = {
  amount?: number;
  expiresAt?: string;
  dayLabel?: string;
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
  duration?: "FULL" | "FIRST_HALF" | "SECOND_HALF";
  days?: number;
  excludedDays?: string[];
  usesCr?: boolean;
  startTime?: string;
  endTime?: string;
  nightMinutes?: number;
  from?: string;
  to?: string;
  purpose?: string;
  departureTime?: string | null;
  returnTime?: string | null;
  returnDate?: string;
  claimPercent?: number;
};

const dayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  timeZone: APP_TIME_ZONE,
});
const weekdayFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  timeZone: APP_TIME_ZONE,
});
const keyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE });

/** `YYYY-MM-DD` for an instant, as seen in India. */
function dayKey(date: Date | string): string {
  return keyFormat.format(new Date(date));
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 86_400_000);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Floats from the ledger (0.5 CR, 9.6 h) lose their noise but keep the half. */
function trim(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatRange(start: Date | string, end: Date | string): string {
  const a = dayKey(start);
  const b = dayKey(end);
  if (a === b) return formatShortDate(start);
  if (a.slice(0, 7) === b.slice(0, 7)) {
    return `${dayFormat.format(new Date(start))}–${formatShortDate(end)}`;
  }
  if (a.slice(0, 4) === b.slice(0, 4)) {
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function tileFor(date: Date): EventSummary["tile"] {
  return {
    day: dayFormat.format(date),
    weekday: weekdayFormat.format(date),
  };
}

function claimPill(status?: string | null): EventSummary["pill"] {
  if (!status) return undefined;
  return {
    label: CLAIM_PILL_LABELS[status] ?? CLAIM_STATUS_LABELS[status] ?? status,
    tone: claimStatusVariant(status),
  };
}

function remarkOf(event: SummaryEvent): string | undefined {
  const text = event.remarks?.trim();
  return text ? text : undefined;
}

function summarizeNightDuty(
  event: SummaryEvent,
  p: Payload,
  ctx: SummaryContext,
): EventSummary {
  const meta: string[] = [];
  if (p.startTime && p.endTime) meta.push(`${p.startTime}–${p.endTime}`);
  if (p.nightMinutes != null) meta.push(`${minutesLabel(p.nightMinutes)} night`);
  return {
    headline: "Night duty",
    meta,
    value: p.amount != null ? formatCurrency(p.amount) : undefined,
    pill: claimPill(ctx.claimStatus),
    note: remarkOf(event),
    tile: tileFor(event.occurredAt),
  };
}

function summarizeTravel(
  event: SummaryEvent,
  p: Payload,
  ctx: SummaryContext,
): EventSummary {
  const from = p.from?.trim();
  const to = p.to?.trim();
  const legacy = event.title.replace(/^Travel\s*(—|-)?\s*/i, "").trim();
  const route = from && to ? `${from} → ${to}` : (to ?? (legacy || event.title));

  const meta: string[] = [];
  if (p.departureTime && p.returnTime) {
    const sameDay =
      !p.returnDate || dayKey(p.returnDate) === dayKey(event.occurredAt);
    meta.push(
      sameDay
        ? `${p.departureTime}–${p.returnTime}`
        : `${p.departureTime} → ${formatShortDate(p.returnDate!)} ${p.returnTime}`,
    );
  } else if (p.departureTime) {
    meta.push(`Left ${p.departureTime}`);
  }
  if (p.claimPercent != null) meta.push(`${trim(p.claimPercent)}% claim`);
  if (p.purpose && p.purpose.trim() !== to) meta.push(p.purpose.trim());

  return {
    headline: route,
    meta,
    value: p.amount != null ? formatCurrency(p.amount) : undefined,
    pill: claimPill(ctx.claimStatus),
    note: remarkOf(event),
    tile: tileFor(event.occurredAt),
  };
}

/** "CL" becomes "CL leave"; "Paternity leave" and "Joining time" already read well. */
function leaveHeadline(type: LeaveType): string {
  const short = LEAVE_TYPE_SHORT_LABELS[type] ?? type;
  return /leave$|time$/i.test(short) ? short : `${short} leave`;
}

function summarizeLeave(event: SummaryEvent, p: Payload): EventSummary {
  const tile = tileFor(event.occurredAt);
  const days = p.days;
  const value = days != null ? plural(days, "day") : undefined;

  // Entries saved before the payload carried a leave type only have a title.
  if (!p.leaveType) {
    const legacy = formatEventCardDisplay(event.domain, event.title, event.occurredAt, p);
    return { headline: legacy.headline, meta: [], value, note: remarkOf(event), tile };
  }

  const meta: string[] = [];
  const start = p.startDate ?? event.occurredAt;
  meta.push(formatRange(start, p.endDate ?? start));
  if (p.duration === "FIRST_HALF") meta.push("First half");
  if (p.duration === "SECOND_HALF") meta.push("Second half");
  const skipped = p.excludedDays?.length ?? 0;
  if (skipped > 0) meta.push(`${skipped} not counted`);

  return {
    headline: p.usesCr ? "CR leave" : leaveHeadline(p.leaveType),
    meta,
    value,
    note: remarkOf(event),
    tile,
  };
}

/** Days a CR credit is worth: from the payload, or the "+1 CR earned" title of older entries. */
function crAmount(title: string, p: Payload): number {
  return p.amount ?? Number(title.match(/^\+(\d+(?:\.\d+)?)/)?.[1] ?? 1);
}

function summarizeCrCredit(
  event: SummaryEvent,
  p: Payload,
  ctx: SummaryContext,
): EventSummary {
  const amount = crAmount(event.title, p);
  const expiresAt =
    p.expiresAt ?? event.title.match(/\(expires\s+([^)]+)\)/i)?.[1] ?? null;
  const usage = ctx.crUsage ?? null;
  const fullyUsed = usage != null && usage.used >= amount;
  const left = usage ? Math.max(0, amount - usage.used) : amount;

  const meta: string[] = [];
  let pill: EventSummary["pill"];
  if (usage && fullyUsed) {
    meta.push(`Used on ${formatDate(usage.appliedAt)}`);
    pill = { label: "Used", tone: "muted" };
  } else {
    if (usage) meta.push(`${trim(usage.used)} used on ${formatDate(usage.appliedAt)}`);
    // A credit is valid on dates before its expiry date.
    const daysLeft =
      expiresAt && !Number.isNaN(new Date(expiresAt).getTime())
        ? daysBetween(dayKey(ctx.now ?? new Date()), dayKey(expiresAt))
        : null;
    const availableLabel = usage ? `${trim(left)} left` : "Available";
    if (daysLeft == null) {
      pill = { label: availableLabel, tone: "success" };
    } else if (daysLeft <= 0) {
      meta.push(`Expired ${formatDate(expiresAt!)}`);
      pill = { label: "Expired", tone: "critical" };
    } else {
      meta.push(`Expires ${formatDate(expiresAt!)}`);
      pill =
        daysLeft <= 14
          ? { label: usage ? `${trim(left)} left · ${daysLeft}d` : `${daysLeft}d left`, tone: "warning" }
          : { label: availableLabel, tone: "success" };
    }
  }

  return {
    headline: p.dayLabel ? `CR · ${p.dayLabel}` : "CR earned",
    meta,
    value: `+${trim(amount)} CR`,
    pill,
    muted: fullyUsed,
    tile: tileFor(event.occurredAt),
  };
}

export function summarizeEvent(
  event: SummaryEvent,
  ctx: SummaryContext = {},
): EventSummary {
  const p = (event.payload ?? {}) as Payload;
  switch (event.eventType) {
    case "NIGHT_DUTY_RECORDED":
      return summarizeNightDuty(event, p, ctx);
    case "TRAVEL_RECORDED":
      return summarizeTravel(event, p, ctx);
    case "LEAVE_RECORDED":
      return summarizeLeave(event, p);
    case "CR_CREDIT_ISSUED":
      return summarizeCrCredit(event, p, ctx);
    default:
      return {
        headline: formatEventCardDisplay(event.domain, event.title, event.occurredAt, p, event.eventType)
          .headline,
        meta: [],
        note: remarkOf(event),
        tile: tileFor(event.occurredAt),
      };
  }
}

export type EventTotals = {
  count: number;
  /** Night duty + travel money in the group. */
  claimAmount: number;
  leaveDays: number;
  crEarned: number;
};

export function totalEvents(
  events: { eventType: string; title: string; payload: unknown }[],
): EventTotals {
  const totals: EventTotals = { count: events.length, claimAmount: 0, leaveDays: 0, crEarned: 0 };
  for (const e of events) {
    const p = (e.payload ?? {}) as Payload;
    if (e.eventType === "NIGHT_DUTY_RECORDED" || e.eventType === "TRAVEL_RECORDED") {
      totals.claimAmount += p.amount ?? 0;
    } else if (e.eventType === "LEAVE_RECORDED") {
      totals.leaveDays += p.days ?? 0;
    } else if (e.eventType === "CR_CREDIT_ISSUED") {
      totals.crEarned += crAmount(e.title, p);
    }
  }
  return totals;
}

/** Short chips for a month header or the page header: only non-zero parts. */
export function describeTotals(totals: EventTotals): string[] {
  const parts: string[] = [];
  if (totals.claimAmount > 0) parts.push(formatCurrency(totals.claimAmount));
  if (totals.leaveDays > 0) parts.push(`${trim(totals.leaveDays)}d leave`);
  if (totals.crEarned > 0) parts.push(`+${trim(totals.crEarned)} CR`);
  return parts;
}
