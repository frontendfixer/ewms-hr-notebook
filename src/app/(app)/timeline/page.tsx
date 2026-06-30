import { requireUserId } from "@/lib/auth-server";
import { eventService } from "@/lib/services/event-service";
import { EventDomain } from "@/generated/prisma/client";
import { EventCard } from "@/components/timeline/event-card";
import {
  TimelineDomainChips,
  TimelinePeriodFilters,
} from "@/components/filters/filter-chips";
import { Suspense } from "react";
import { EventCardSkeleton } from "@/components/timeline/event-card";
import { format } from "date-fns";
import { domainFromFilter, getFilterDates } from "@/lib/event-filters";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const userId = await requireUserId();
  const { filter } = await searchParams;
  const { from, to } = getFilterDates(filter);
  const domain = domainFromFilter(filter);

  const events = await eventService.getEvents(userId, {
    domain,
    from,
    to,
    limit: 100,
    rootOnly: filter !== "pending",
  });

  const filtered =
    filter === "pending"
      ? events.filter((e) => {
          const p = e.payload as { currentStatus?: string };
          return (
            (e.eventType === "NIGHT_DUTY_RECORDED" ||
              e.eventType === "TRAVEL_RECORDED") &&
            p.currentStatus !== "PAID"
          );
        })
      : events;

  const byMonth = filtered.reduce<Record<string, typeof filtered>>((acc, e) => {
    const key = format(e.occurredAt, "MMMM yyyy");
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Timeline</h1>
        <Suspense>
          <TimelinePeriodFilters />
        </Suspense>
      </div>
      <Suspense>
        <TimelineDomainChips />
      </Suspense>

      {filtered.length === 0 ? (
        <p className="px-2 py-12 text-center text-muted-foreground">
          No records yet. Tap + to add your first entry.
        </p>
      ) : (
        Object.entries(byMonth).map(([month, monthEvents]) => (
          <div key={month}>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              {month}
            </h2>
            <div className="space-y-2">
              {monthEvents.map((e) => (
                <EventCard
                  key={e.id}
                  id={e.id}
                  title={e.title}
                  domain={e.domain}
                  occurredAt={e.occurredAt}
                  payload={e.payload}
                  eventType={e.eventType}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
