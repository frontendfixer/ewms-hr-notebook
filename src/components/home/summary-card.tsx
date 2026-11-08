"use client";

import { useId, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Award, Moon, Palmtree, Train } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DOMAIN_STYLES } from "@/lib/design-tokens";
import { cn, formatCurrency } from "@/lib/utils";
import type { InsightsData } from "@/lib/services/insight-service";

const PERIODS = [
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
] as const;
type Period = (typeof PERIODS)[number]["id"];

type Counts = { nightDuty: number; leave: number; travel: number; cr: number };

const STATS = [
  { key: "nightDuty", label: "Night duty", icon: Moon, domain: "NIGHT_DUTY" },
  { key: "leave", label: "Leave", icon: Palmtree, domain: "LEAVE" },
  { key: "travel", label: "Travel", icon: Train, domain: "TRAVEL" },
  { key: "cr", label: "CR earned", icon: Award, domain: "CR" },
] as const satisfies ReadonlyArray<{
  key: keyof Counts;
  label: string;
  icon: typeof Moon;
  domain: keyof typeof DOMAIN_STYLES;
}>;

function StatGrid({ counts }: { counts: Counts }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STATS.map(({ key, label, icon: Icon, domain }) => {
        const styles = DOMAIN_STYLES[domain];
        return (
          <div
            key={key}
            className={cn(
              "flex flex-col items-center rounded-lg px-1 py-2 ring-1",
              styles.card,
              styles.ring,
            )}
          >
            <Icon className={cn("h-4 w-4", styles.label)} aria-hidden />
            <span className="mt-1 text-xl font-bold tabular-nums leading-none">
              {counts[key]}
            </span>
            <span className={cn("mt-1 text-[10px] font-medium", styles.label)}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SummaryCard({ insights }: { insights: InsightsData }) {
  const [period, setPeriod] = useState<Period>("month");
  const baseId = useId();
  const { thisMonth, yearToDate } = insights;

  const monthCounts: Counts = {
    nightDuty: thisMonth.nightDuty,
    leave: thisMonth.leave,
    travel: thisMonth.travel,
    cr: thisMonth.cr,
  };
  const yearCounts: Counts = {
    nightDuty: yearToDate.nightDuty,
    leave: yearToDate.leaveRecords,
    travel: yearToDate.travel,
    cr: yearToDate.crCredits,
  };
  const monthTotal = thisMonth.total;
  const yearTotal =
    yearCounts.nightDuty + yearCounts.leave + yearCounts.travel + yearCounts.cr;
  const total = period === "month" ? monthTotal : yearTotal;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: Period = period === "month" ? "year" : "month";
    setPeriod(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  }

  // Only the active panel takes space, so the card stays as short as its content.
  const panelClass = (id: Period) => cn("space-y-2.5", period !== id && "hidden");

  return (
    <Card className="p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Summary period"
          className="inline-flex rounded-lg bg-muted p-0.5"
        >
          {PERIODS.map(({ id, label }) => (
            <button
              key={id}
              id={`${baseId}-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={period === id}
              aria-controls={`${baseId}-panel-${id}`}
              tabIndex={period === id ? 0 : -1}
              onClick={() => setPeriod(id)}
              onKeyDown={onKeyDown}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium transition-colors",
                period === id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {period === "month" ? `${insights.monthLabel} · ` : ""}
          {total} record{total === 1 ? "" : "s"}
        </span>
      </div>

      <div>
        <div
          role="tabpanel"
          id={`${baseId}-panel-month`}
          aria-labelledby={`${baseId}-tab-month`}
          className={panelClass("month")}
        >
          <StatGrid counts={monthCounts} />
          <div className="flex items-center justify-between gap-3 text-xs">
            {thisMonth.pendingAmount > 0 ? (
              <span className={cn("font-medium", DOMAIN_STYLES.TRAVEL.label)}>
                {formatCurrency(thisMonth.pendingAmount)} claims pending
              </span>
            ) : (
              <span className="text-muted-foreground">No claims pending this month</span>
            )}
            <Link
              href="/timeline?filter=month"
              className="shrink-0 font-medium text-primary hover:underline"
            >
              Timeline →
            </Link>
          </div>
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel-year`}
          aria-labelledby={`${baseId}-tab-year`}
          className={panelClass("year")}
        >
          <StatGrid counts={yearCounts} />
          <div className="flex items-start justify-between gap-3 text-xs">
            <p className="min-w-0 text-muted-foreground">
              <span className="font-medium text-foreground">
                {insights.sundaysWorkedThisYear}
              </span>{" "}
              Sundays worked ·{" "}
              <span className="font-medium text-foreground">
                {insights.avgNightDutyPerMonth}
              </span>{" "}
              night duties/mo
              {insights.mostVisited && (
                <>
                  {" "}
                  · Top trip{" "}
                  <span className="font-medium text-foreground">
                    {insights.mostVisited}
                  </span>{" "}
                  ({insights.mostVisitedCount}×)
                </>
              )}
            </p>
            <Link
              href="/reports/insights"
              className="shrink-0 font-medium text-primary hover:underline"
            >
              Reports →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
