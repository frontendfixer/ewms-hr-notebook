import Link from "next/link";
import { requireUserId } from "@/lib/auth-server";
import { insightService } from "@/lib/services/insight-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAIN_LABELS } from "@/lib/design-tokens";
import { domainBarClass, domainLabelClass } from "@/lib/domain-styles";
import type { EventDomain } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

export default async function ReportsPage() {
  const userId = await requireUserId();
  const insights = await insightService.getInsights(userId);
  const now = new Date();
  const report = await insightService.getMonthlyReport(
    userId,
    now.getFullYear(),
    now.getMonth() + 1,
  );

  const maxCount = Math.max(...Object.values(report.byDomain), 1);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Link
          href="/reports/insights"
          className="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm hover:bg-accent"
        >
          Insights
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(report.byDomain).map(([domain, count]) => {
            const key = domain as EventDomain;
            return (
              <div key={domain}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={domainLabelClass(key)}>
                    {DOMAIN_LABELS[key] ?? domain}
                  </span>
                  <span>{count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={cn("h-2 rounded-full", domainBarClass(key))}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Year at a glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Sundays worked: {insights.sundaysWorkedThisYear}</p>
          <p>Avg night duties/month: {insights.avgNightDutyPerMonth}</p>
          {insights.mostVisited && (
            <p>
              Top destination: {insights.mostVisited} ({insights.mostVisitedCount}
              trips)
            </p>
          )}
        </CardContent>
      </Card>

      <a
        href="/api/export/monthly"
        className="inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm hover:bg-accent"
      >
        Export CSV
      </a>
    </div>
  );
}
