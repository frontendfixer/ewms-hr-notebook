"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { EventDomain } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { domainChipActiveClass } from "@/lib/domain-styles";
import {
  parseTimelineFilters,
  timelineHref,
  type TimelinePeriod,
  type TimelineType,
} from "@/lib/timeline-filters";

const typeChips: Array<{
  type: TimelineType;
  label: string;
  domain?: EventDomain;
}> = [
  { type: "all", label: "All" },
  { type: "CR", label: "CR", domain: "CR" },
  { type: "LEAVE", label: "Leave", domain: "LEAVE" },
  { type: "NIGHT_DUTY", label: "Night", domain: "NIGHT_DUTY" },
  { type: "TRAVEL", label: "TA", domain: "TRAVEL" },
  { type: "pending", label: "Pending" },
];

const periods: Array<{ period: TimelinePeriod; label: string }> = [
  { period: "all", label: "All" },
  { period: "month", label: "Month" },
  { period: "year", label: "Year" },
];

function useTimelineFilters() {
  const params = useSearchParams();
  return parseTimelineFilters(
    params.get("filter") ?? undefined,
    params.get("period") ?? undefined,
  );
}

/** Time range switch. Keeps the chosen entry type. */
export function TimelinePeriodFilters({
  basePath = "/timeline",
}: {
  basePath?: string;
}) {
  const filters = useTimelineFilters();

  return (
    <nav
      aria-label="Time range"
      className="flex shrink-0 rounded-lg bg-muted p-0.5 text-xs font-medium"
    >
      {periods.map(({ period, label }) => {
        const active = filters.period === period;
        return (
          <Link
            key={period}
            href={timelineHref({ ...filters, period }, undefined, basePath)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex min-h-8 min-w-12 items-center justify-center rounded-md px-3 transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Entry type chips. Keeps the chosen time range. */
export function TimelineDomainChips({
  basePath = "/timeline",
}: {
  basePath?: string;
}) {
  const filters = useTimelineFilters();

  return (
    <nav
      aria-label="Entry type"
      className="-mx-4 min-w-0 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0"
    >
      <div className="flex w-max flex-nowrap gap-1.5">
        {typeChips.map(({ type, label, domain }) => {
          const active = filters.type === type;
          return (
            <Link
              key={type}
              href={timelineHref({ ...filters, type }, undefined, basePath)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-medium whitespace-nowrap transition-colors",
                active
                  ? domain
                    ? domainChipActiveClass(domain)
                    : "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
