"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  isTimeOrStatusFilter,
  parseRecordTypeFromPath,
  type RecordType,
} from "@/lib/record-routes";
import { domainChipActiveClass, recordTypeDomain } from "@/lib/domain-styles";

const domainChips: { type: RecordType | "pending"; label: string }[] = [
  { type: "all", label: "All" },
  { type: "cr", label: "CR" },
  { type: "leave", label: "Leave" },
  { type: "night", label: "Night" },
  { type: "ta", label: "TA" },
  { type: "pending", label: "Pending" },
];

const periodChips = [
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
] as const;

function periodHref(type: RecordType, key: string | null) {
  return key ? `/records/${type}?filter=${key}` : `/records/${type}`;
}

function chipClass(active: boolean, type: RecordType | "pending") {
  const base =
    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors";

  if (!active) {
    return cn(
      base,
      "border-border bg-card text-muted-foreground hover:bg-accent",
    );
  }

  if (type === "pending" || type === "all") {
    return cn(base, "border-primary bg-primary/10 text-primary");
  }

  const domain = recordTypeDomain(type);
  if (domain) {
    return cn(base, domainChipActiveClass(domain));
  }

  return cn(base, "border-primary bg-primary/10 text-primary");
}

export function RecordsPeriodFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeType = parseRecordTypeFromPath(pathname);
  const timeFilter = searchParams.get("filter");
  const activePeriod =
    timeFilter === "month" || timeFilter === "year" ? timeFilter : null;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {periodChips.map(({ key, label }) => (
        <Link
          key={key}
          href={periodHref(activeType, activePeriod === key ? null : key)}
          className={chipClass(activePeriod === key, "all")}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function RecordsDomainChips() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeType = parseRecordTypeFromPath(pathname);
  const timeFilter = searchParams.get("filter");
  const activePending = timeFilter === "pending";

  return (
    <div className="-mx-4 min-w-0 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:px-0">
      <div className="flex w-max flex-nowrap gap-2">
        {domainChips.map(({ type, label }) => {
          const isPending = type === "pending";
          const active = isPending
            ? activePending
            : activeType === type &&
              !activePending &&
              timeFilter !== "month" &&
              timeFilter !== "year";
          const href = isPending
            ? activePending
              ? `/records/${activeType}`
              : `/records/${activeType}?filter=pending`
            : `/records/${type}`;

          return (
            <Link key={type} href={href} className={chipClass(active, type)}>
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** @deprecated Use RecordsDomainChips and RecordsPeriodFilters */
export function RecordsFilterChips() {
  return <RecordsDomainChips />;
}
