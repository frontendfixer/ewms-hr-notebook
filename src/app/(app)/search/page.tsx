import { requireUserId } from "@/lib/auth-server";
import { eventService } from "@/lib/services/event-service";
import { EventCard } from "@/components/timeline/event-card";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const userId = await requireUserId();
  const { q } = await searchParams;

  if (!q || q.length < 2) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-muted-foreground">
        Enter at least 2 characters to search
      </div>
    );
  }

  const events = await eventService.getEvents(userId, { search: q, limit: 30 });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">
        Results for &ldquo;{q}&rdquo;
      </h1>
      {events.length === 0 ? (
        <p className="text-muted-foreground">No matches found</p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
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
      )}
      <Link href="/home" className="text-sm text-primary">
        ← Back home
      </Link>
    </div>
  );
}
