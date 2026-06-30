"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { EventDomain } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { domainChipActiveClass } from "@/lib/domain-styles";

const domainChips: Array<{
  key: string;
  label: string;
  domain?: EventDomain;
}> = [
  { key: "all", label: "All" },
  { key: "CR", label: "CR", domain: "CR" as EventDomain },
  { key: "LEAVE", label: "Leave", domain: "LEAVE" as EventDomain },
  { key: "NIGHT_DUTY", label: "Night", domain: "NIGHT_DUTY" as EventDomain },
  { key: "TRAVEL", label: "TA", domain: "TRAVEL" as EventDomain },
  { key: "pending", label: "Pending" },
];

const periodChips = [
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
] as const;

function chipClass(active: boolean, domain?: EventDomain) {
  const base =
    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors";

  if (!active) {
    return cn(
      base,
      "border-border bg-card text-muted-foreground hover:bg-accent",
    );
  }

  if (domain) {
    return cn(base, domainChipActiveClass(domain));
  }

  return cn(base, "border-primary bg-primary/10 text-primary");
}

export function TimelinePeriodFilters({
  basePath = "/timeline",
}: {
  basePath?: string;
}) {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const activePeriod =
    filter === "month" || filter === "year" ? filter : null;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {periodChips.map(({ key, label }) => (
        <Link
          key={key}
          href={
            activePeriod === key ? basePath : `${basePath}?filter=${key}`
          }
          className={chipClass(activePeriod === key)}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function TimelineDomainChips({
  basePath = "/timeline",
}: {
  basePath?: string;
}) {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") ?? "all";
  const activePending = filter === "pending";

  return (
    <div className="-mx-4 min-w-0 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:px-0">
      <div className="flex w-max flex-nowrap gap-2">
        {domainChips.map(({ key, label, domain }) => {
          const isPending = key === "pending";
          const active = isPending
            ? activePending
            : filter === key &&
              !activePending &&
              filter !== "month" &&
              filter !== "year";
          const href =
            key === "all"
              ? basePath
              : isPending
                ? activePending
                  ? basePath
                  : `${basePath}?filter=pending`
                : `${basePath}?filter=${key}`;

          return (
            <Link key={key} href={href} className={chipClass(active, domain)}>
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** @deprecated Use TimelineDomainChips and TimelinePeriodFilters */
export function FilterChips({ basePath = "/timeline" }: { basePath?: string }) {
  return <TimelineDomainChips basePath={basePath} />;
}
