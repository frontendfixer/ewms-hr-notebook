import Link from "next/link";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth-server";
import { eventService, type CrUsage } from "@/lib/services/event-service";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { EventCard } from "@/components/timeline/event-card";
import { EventList } from "@/components/timeline/event-row";
import {
  TimelineDomainChips,
  TimelinePeriodFilters,
} from "@/components/filters/filter-chips";
import { timelineDomain } from "@/lib/event-filters";
import {
  getPeriodRange,
  parseTimelineFilters,
  parseTimelineLimit,
  timelineHref,
  TIMELINE_MAX_LIMIT,
  TIMELINE_PAGE_SIZE,
} from "@/lib/timeline-filters";
import { describeTotals, totalEvents } from "@/lib/event-summary";
import { formatMonthYear } from "@/lib/utils";

const CLAIM_TYPES = ["NIGHT_DUTY_RECORDED", "TRAVEL_RECORDED"] as const;

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; period?: string; limit?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const filters = parseTimelineFilters(params.filter, params.period);
  const limit = parseTimelineLimit(params.limit);
  const { from, to } = getPeriodRange(filters.period);

  const events = await eventService.getEvents(userId, {
    domain: timelineDomain(filters.type),
    from,
    to,
    limit,
    rootOnly: true,
    // Pending only concerns claims; asking for just those keeps the limit
    // from being spent on CR and leave rows that would be filtered out.
    ...(filters.type === "pending" ? { eventTypes: [...CLAIM_TYPES] } : {}),
  });

  // Claim status lives on the monthly settlement, so ask for the real thing
  // rather than trusting each entry's own payload. Both lookups are batched:
  // one query for all claims, one for CR usage.
  const [claimStatuses, crUsage] = await Promise.all([
    claimStatusService.getStatuses(
      events.filter((e) => (CLAIM_TYPES as readonly string[]).includes(e.eventType)),
    ),
    events.some((e) => e.eventType === "CR_CREDIT_ISSUED")
      ? eventService.getCrUsage(userId)
      : new Map<string, CrUsage>(),
  ]);

  const rows = events
    .map((event) => ({
      event,
      claimStatus: claimStatuses.get(event.id) ?? null,
      crUsage: crUsage.get(event.id) ?? null,
    }))
    .filter(({ claimStatus }) =>
      filters.type === "pending"
        ? claimStatus != null && claimStatus !== "PAID"
        : true,
    );

  const months: { label: string; rows: typeof rows }[] = [];
  for (const row of rows) {
    const label = formatMonthYear(row.event.occurredAt);
    const last = months.at(-1);
    if (last?.label === label) last.rows.push(row);
    else months.push({ label, rows: [row] });
  }

  // When the list is cut at the limit, the oldest month is only partly shown,
  // so its total (and a plain "N entries") would read like a full count.
  const mayHaveMore = events.length >= limit && limit < TIMELINE_MAX_LIMIT;
  const cutOff = events.length >= limit;
  const totals = totalEvents(rows.map((r) => r.event));
  const summary = [
    cutOff
      ? `Latest ${totals.count}`
      : `${totals.count} ${totals.count === 1 ? "entry" : "entries"}`,
    ...describeTotals(totals).map((part, i) =>
      filters.type === "pending" && i === 0 ? `${part} pending` : part,
    ),
  ];
  const hasFilters = filters.type !== "all" || filters.period !== "all";

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3">
      <header className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight">Timeline</h1>
          {rows.length > 0 && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {summary.join("\u00A0· ")}
            </p>
          )}
        </div>
        <Suspense>
          <TimelinePeriodFilters />
        </Suspense>
      </header>
      <Suspense>
        <TimelineDomainChips />
      </Suspense>

      {rows.length === 0 ? (
        <div className="px-2 py-12 text-center text-sm text-muted-foreground">
          {hasFilters ? (
            <>
              <p>
                {mayHaveMore
                  ? `Nothing in the latest ${limit} entries matches these filters.`
                  : "Nothing matches these filters."}
              </p>
              <Link
                href="/timeline"
                className="mt-2 inline-block font-medium text-primary hover:underline"
              >
                Show everything
              </Link>
            </>
          ) : (
            <p>No records yet. Tap + to add your first entry.</p>
          )}
        </div>
      ) : (
        months.map(({ label, rows: monthRows }, monthIndex) => {
          const partial = cutOff && monthIndex === months.length - 1;
          const monthTotals = partial
            ? []
            : describeTotals(totalEvents(monthRows.map((r) => r.event)));
          return (
            <section key={label} aria-label={label}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-xs font-semibold text-muted-foreground">
                  {label}
                </h2>
                {monthTotals.length > 0 && (
                  <p className="truncate text-xs tabular-nums text-muted-foreground">
                    {monthTotals.join(" · ")}
                  </p>
                )}
              </div>
              <EventList>
                {monthRows.map(({ event, claimStatus, crUsage }) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    domain={event.domain}
                    occurredAt={event.occurredAt}
                    payload={event.payload}
                    eventType={event.eventType}
                    remarks={event.remarks}
                    claimStatus={claimStatus}
                    crUsage={crUsage}
                  />
                ))}
              </EventList>
            </section>
          );
        })
      )}

      {mayHaveMore && (
        <Link
          href={timelineHref(filters, limit + TIMELINE_PAGE_SIZE)}
          scroll={false}
          className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-card text-sm font-medium text-primary hover:bg-accent"
        >
          Show older entries
        </Link>
      )}
    </div>
  );
}
