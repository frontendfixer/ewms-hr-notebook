import { requireUserId } from "@/lib/auth-server";
import { eventService } from "@/lib/services/event-service";
import { EventCard } from "@/components/timeline/event-card";
import {
  RecordsDomainChips,
  RecordsPeriodFilters,
} from "@/components/filters/records-filter-chips";
import { ledgerService } from "@/lib/services/ledger-service";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getFilterDates,
  isTimeOrStatusFilter,
  parseRecordType,
  RECORD_TYPE_TITLES,
  recordTypeToDomain,
  type RecordType,
} from "@/lib/event-filters";

async function RecordsList({
  type,
  timeFilter,
}: {
  type: RecordType;
  timeFilter?: string;
}) {
  const userId = await requireUserId();
  const domain = recordTypeToDomain(type);
  const { from, to } = getFilterDates(
    isTimeOrStatusFilter(timeFilter) ? timeFilter : undefined,
  );

  const events = await eventService.getEvents(userId, {
    domain,
    from,
    to,
    limit: 50,
    rootOnly: timeFilter !== "pending",
  });

  const filtered =
    timeFilter === "pending"
      ? events.filter((e) => {
          const p = e.payload as { currentStatus?: string };
          return (
            (e.eventType === "NIGHT_DUTY_RECORDED" ||
              e.eventType === "TRAVEL_RECORDED") &&
            p.currentStatus !== "PAID"
          );
        })
      : events;

  if (filtered.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No records yet. Tap + to add.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((e) => (
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
  );
}

export default async function RecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { type: rawType } = await params;
  const { filter } = await searchParams;

  const type = parseRecordType(rawType);
  if (!type) {
    notFound();
  }

  let crExtra = null;
  if (type === "cr") {
    const userId = await requireUserId();
    const credits = await ledgerService.getAvailableCrCredits(userId);
    crExtra = (
      <div className="space-y-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Available CR credits</p>
            {credits.length === 0 ? (
              <p className="text-sm">None</p>
            ) : (
              credits.map((c) => (
                <p key={c.creditEventId} className="text-sm">
                  {c.balance} day — expires{" "}
                  {c.expiresAt ? formatDate(c.expiresAt) : "—"}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{RECORD_TYPE_TITLES[type]}</h1>
        <Suspense>
          <RecordsPeriodFilters />
        </Suspense>
      </div>
      <Suspense>
        <RecordsDomainChips />
      </Suspense>
      {crExtra}
      <RecordsList type={type} timeFilter={filter} />
    </div>
  );
}
