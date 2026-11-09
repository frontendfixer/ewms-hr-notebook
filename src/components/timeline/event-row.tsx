import Link from "next/link";
import type { EventDomain } from "@/generated/prisma/client";
import { Award, Moon, NotebookText, Palmtree, Sun, Train } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EventActions } from "@/components/timeline/event-actions";
import { DOMAIN_STYLES, USED_CR_STYLES } from "@/lib/design-tokens";
import type { EventSummary } from "@/lib/event-summary";
import { cn } from "@/lib/utils";

const DOMAIN_ICONS: Record<EventDomain, typeof Sun> = {
  CR: Award,
  LEAVE: Palmtree,
  NIGHT_DUTY: Moon,
  TRAVEL: Train,
  META: Sun,
};

/** A group of rows in one card, divided by hairlines. */
export function EventList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      className={cn("divide-y divide-border/60 overflow-hidden", className)}
      {...props}
    />
  );
}

/**
 * One entry, two or three lines tall: date tile, what it is, the key facts,
 * and the figure that matters (money, days, status) on the right.
 */
export function EventRow({
  id,
  domain,
  summary,
  editable,
}: {
  id: string;
  domain: EventDomain;
  summary: EventSummary;
  editable: boolean;
}) {
  const Icon = DOMAIN_ICONS[domain];
  const styles = DOMAIN_STYLES[domain];
  const { muted, tile, headline, meta, value, pill, note } = summary;

  return (
    <div className="flex items-stretch transition-colors hover:bg-accent/40">
      <Link
        href={`/timeline/${id}`}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 active:bg-accent/60"
      >
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none",
            muted ? USED_CR_STYLES.icon : styles.icon,
          )}
        >
          <span className="text-base font-semibold tabular-nums">{tile.day}</span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-80">
            {tile.weekday}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                muted ? USED_CR_STYLES.label : styles.label,
              )}
              aria-hidden
            />
            <span
              className={cn(
                "truncate text-sm font-medium",
                muted && "text-muted-foreground",
              )}
            >
              {headline}
            </span>
          </span>
          {meta.length > 0 && (
            <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {/* nbsp keeps a wrapped line from starting with the dot */}
              {meta.join("\u00A0· ")}
            </span>
          )}
          {note && (
            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/80">
              <NotebookText className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{note}</span>
            </span>
          )}
        </span>

        {(value || pill) && (
          <span className="flex shrink-0 flex-col items-end gap-1 pl-1">
            {value && (
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  muted && "font-medium text-muted-foreground",
                )}
              >
                {value}
              </span>
            )}
            {pill && (
              <Badge
                variant={pill.tone}
                className="px-2 py-0 text-[11px] leading-5"
              >
                {pill.label}
              </Badge>
            )}
          </span>
        )}
      </Link>
      <EventActions
        id={id}
        label={`${headline}, ${tile.weekday} ${tile.day}`}
        editable={editable}
      />
    </div>
  );
}

export function EventRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
    </div>
  );
}
