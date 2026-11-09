import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  MapPin,
  Moon,
  Palmtree,
  Train,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { requireUserId } from "@/lib/auth-server";
import { insightService } from "@/lib/services/insight-service";
import { Card } from "@/components/ui/card";
import { DOMAIN_STYLES } from "@/lib/design-tokens";
import type { EventDomain } from "@/generated/prisma/client";
import { cn, formatCurrency } from "@/lib/utils";

function Stat({
  icon: Icon,
  domain,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  domain?: EventDomain;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          domain ? DOMAIN_STYLES[domain].icon : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-tight tabular-nums">{value}</span>
        <span className="block truncate text-xs font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </Card>
  );
}

export default async function InsightsPage() {
  const userId = await requireUserId();
  const insights = await insightService.getInsights(userId);
  const { yearToDate, thisMonth } = insights;

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3">
      <header className="flex items-center gap-2 px-1">
        <Link
          href="/reports"
          aria-label="Back to reports"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Insights</h1>
          <p className="text-xs text-muted-foreground">
            Calendar year to date
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={Calendar}
          domain="CR"
          label="Sundays worked"
          value={String(insights.sundaysWorkedThisYear)}
          hint="this year"
        />
        <Stat
          icon={Award}
          domain="CR"
          label="CR credits"
          value={String(yearToDate.crCredits)}
          hint={`${thisMonth.cr} this month · counts entries`}
        />
        <Stat
          icon={Moon}
          domain="NIGHT_DUTY"
          label="Night duties"
          value={String(yearToDate.nightDuty)}
          hint={`${insights.avgNightDutyPerMonth} a month on average`}
        />
        <Stat
          icon={Train}
          domain="TRAVEL"
          label="Journeys"
          value={String(yearToDate.travel)}
          hint={`${thisMonth.travel} this month`}
        />
        <Stat
          icon={Palmtree}
          domain="LEAVE"
          label="Leave entries"
          value={String(yearToDate.leaveRecords)}
          hint={`${thisMonth.leave} this month`}
        />
        <Stat
          icon={Wallet}
          label="Pending claims"
          value={formatCurrency(thisMonth.pendingAmount)}
          hint={thisMonth.pendingAmount > 0 ? `not yet received · ${insights.monthLabel}` : `nothing pending · ${insights.monthLabel}`}
        />
      </div>

      {insights.mostVisited && (
        <Card className="flex items-center gap-3 p-3">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", DOMAIN_STYLES.TRAVEL.icon)}>
            <MapPin className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold leading-tight">{insights.mostVisited}</span>
            <span className="block text-xs text-muted-foreground">
              Most visited · {insights.mostVisitedCount} trip{insights.mostVisitedCount === 1 ? "" : "s"}
            </span>
          </span>
        </Card>
      )}
    </div>
  );
}
