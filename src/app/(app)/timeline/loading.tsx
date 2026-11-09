import { Card } from "@/components/ui/card";
import { EventRowSkeleton } from "@/components/timeline/event-row";

/** Same shape as the list, so the page doesn't jump when data arrives. */
export default function TimelineLoading() {
  return (
    <div
      className="mx-auto min-w-0 max-w-2xl space-y-3"
      role="status"
      aria-label="Loading timeline"
    >
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="space-y-1.5">
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-16 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <Card className="divide-y divide-border/60 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <EventRowSkeleton key={i} />
        ))}
      </Card>
    </div>
  );
}
