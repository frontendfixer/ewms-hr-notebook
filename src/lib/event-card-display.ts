import type { EventDomain } from "@/generated/prisma/client";
import { formatDate, formatShortDate } from "@/lib/utils";

export type EventCardDisplay = {
  headline: string;
  subtitle?: string;
};

type EventCardPayload = {
  to?: string;
  from?: string;
  dayLabel?: string;
  amount?: number;
  expiresAt?: string;
};

export function formatEventCardDisplay(
  domain: EventDomain,
  title: string,
  occurredAt: Date,
  payload?: EventCardPayload,
  eventType?: string,
): EventCardDisplay {
  switch (domain) {
    case "NIGHT_DUTY": {
      const stripped = title.replace(/^Night Duty\s*(—|-)?\s*/i, "").trim();
      return { headline: stripped || formatDate(occurredAt) };
    }
    case "TRAVEL": {
      const from = payload?.from?.trim();
      const to = payload?.to?.trim();
      let route =
        to ?? (title.replace(/^Travel\s*(—|-)?\s*/i, "").trim() || title);
      if (from && to) route = `${from} -> ${to}`;
      return { headline: `${formatShortDate(occurredAt)} ${route}` };
    }
    case "LEAVE":
      return {
        headline: title.replace(/\s+leave\s*(—|-)/i, " —"),
      };
    case "CR": {
      if (
        eventType === "CR_CREDIT_ISSUED" ||
        /^\+(\d+)\s*CR earned/i.test(title)
      ) {
        const days = payload?.amount ?? title.match(/^\+(\d+)/)?.[1] ?? "1";
        const expiresAt = payload?.expiresAt
          ? formatDate(payload.expiresAt)
          : title.match(/\(expires\s+([^)]+)\)/i)?.[1];
        return {
          headline: `+${days} CR earned`,
          subtitle: expiresAt ? `Expires ${expiresAt}` : undefined,
        };
      }
      const match = title.match(/^CR work \(([^)]+)\)\s*(—|-)\s*(.+)$/i);
      if (match) return { headline: `${match[1]} — ${match[3]}` };
      if (payload?.dayLabel) {
        return { headline: `${payload.dayLabel} — ${formatDate(occurredAt)}` };
      }
      return {
        headline: title.replace(/^CR work\s*/i, "").trim() || title,
      };
    }
    default:
      return { headline: title };
  }
}

/** @deprecated Use formatEventCardDisplay */
export function formatEventCardHeadline(
  domain: EventDomain,
  title: string,
  occurredAt: Date,
  payload?: EventCardPayload,
  eventType?: string,
): string {
  return formatEventCardDisplay(domain, title, occurredAt, payload, eventType)
    .headline;
}
