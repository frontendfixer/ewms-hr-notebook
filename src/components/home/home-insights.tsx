import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { DOMAIN_STYLES } from "@/lib/design-tokens";
import type { InsightsData } from "@/lib/services/insight-service";
import {
  Award,
  Moon,
  Palmtree,
  Train,
  TrendingUp,
  MapPin,
  BarChart3,
} from "lucide-react";

const monthStatConfig = [
  {
    key: "nightDuty" as const,
    label: "Night Duty",
    icon: Moon,
    domain: "NIGHT_DUTY" as const,
  },
  {
    key: "leave" as const,
    label: "Leave",
    icon: Palmtree,
    domain: "LEAVE" as const,
  },
  {
    key: "travel" as const,
    label: "Travel",
    icon: Train,
    domain: "TRAVEL" as const,
  },
  {
    key: "cr" as const,
    label: "CR Earned",
    icon: Award,
    domain: "CR" as const,
  },
];

export function MonthStatsCard({ insights }: { insights: InsightsData }) {
  const { thisMonth, monthLabel } = insights;

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm ring-1 ring-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">This Month</CardTitle>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {thisMonth.total} record{thisMonth.total === 1 ? "" : "s"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {monthStatConfig.map(({ key, label, icon: Icon, domain }) => {
            const value = thisMonth[key];
            const styles = DOMAIN_STYLES[domain];
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-3 ring-1",
                  styles.card,
                  styles.ring,
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    styles.icon,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-none">{value}</p>
                  <p className={cn("mt-0.5 truncate text-[11px] font-medium", styles.label)}>
                    {label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {thisMonth.pendingAmount > 0 && (
          <p
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-medium",
              DOMAIN_STYLES.TRAVEL.card,
              DOMAIN_STYLES.TRAVEL.label,
            )}
          >
            {formatCurrency(thisMonth.pendingAmount)} pending claims this month
          </p>
        )}
        <Link
          href="/timeline?filter=month"
          className="inline-block text-xs font-medium text-primary hover:underline"
        >
          View this month&apos;s timeline →
        </Link>
      </CardContent>
    </Card>
  );
}

const insightItems = (
  insights: InsightsData,
): Array<{
  icon: typeof Award;
  label: string;
  value: string;
  sub?: string;
  domain: keyof typeof DOMAIN_STYLES;
}> => [
  {
    icon: Award,
    label: "Sundays worked",
    value: String(insights.sundaysWorkedThisYear),
    sub: "this year",
    domain: "CR",
  },
  {
    icon: Moon,
    label: "Night duty avg",
    value: String(insights.avgNightDutyPerMonth),
    sub: "per month",
    domain: "NIGHT_DUTY",
  },
  {
    icon: BarChart3,
    label: "YTD night duties",
    value: String(insights.yearToDate.nightDuty),
    sub: `${insights.yearToDate.travel} travels`,
    domain: "NIGHT_DUTY",
  },
  ...(insights.mostVisited
    ? [
        {
          icon: MapPin,
          label: "Top destination",
          value: insights.mostVisited,
          sub: `${insights.mostVisitedCount}× this year`,
          domain: "TRAVEL" as const,
        },
      ]
    : []),
];

export function InsightsCard({ insights }: { insights: InsightsData }) {
  const items = insightItems(insights);

  return (
    <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Insights</CardTitle>
            <p className="text-xs text-muted-foreground">Your year at a glance</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map(({ icon: Icon, label, value, sub, domain }) => {
          const styles = DOMAIN_STYLES[domain];
          return (
            <div
              key={label}
              className={cn("flex items-center gap-3 rounded-xl p-3", styles.card)}
            >
              <Icon className={cn("h-4 w-4 shrink-0", styles.label)} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("truncate font-semibold", styles.label)}>{value}</p>
              </div>
              {sub && (
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                  {sub}
                </span>
              )}
            </div>
          );
        })}
        <Link
          href="/reports/insights"
          className="inline-block pt-1 text-xs font-medium text-primary hover:underline"
        >
          Full reports →
        </Link>
      </CardContent>
    </Card>
  );
}
