import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { FeedItem } from "@/lib/services/feed-service";
import { AlertTriangle, Calendar, Activity } from "lucide-react";

export function BalanceStrip({
  crBalance,
  clBalance,
  lapBalance,
  pendingMoney,
}: {
  crBalance: number;
  clBalance: number;
  lapBalance: number;
  pendingMoney: number;
}) {
  const tiles = [
    { label: "CR", value: `${crBalance}`, unit: "days", href: "/records/cr" },
    { label: "CL", value: `${clBalance}`, unit: "days", href: "/leaves" },
    { label: "LAP", value: `${lapBalance}`, unit: "days", href: "/leaves" },
    { label: "Claims due", value: formatCurrency(pendingMoney), href: "/claims" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <Link key={t.label} href={t.href}>
          <Card className="h-full transition-shadow hover:shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="text-lg font-bold">
                {t.value}
                {t.unit && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {t.unit}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function FeedList({ items }: { items: FeedItem[] }) {
  const reminders = items.filter((i) => i.type === "REMINDER");
  const upcoming = items.filter((i) => i.type === "UPCOMING");
  const activity = items.filter((i) => i.type === "ACTIVITY");

  return (
    <div className="space-y-6">
      {reminders.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Needs attention</h2>
          <div className="space-y-2">
            {reminders.map((item, i) => (
              <Card
                key={`${item.title}-${i}`}
                className={
                  item.type === "REMINDER" && item.priority === "high"
                    ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30"
                    : ""
                }
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.type === "REMINDER" && item.body && (
                      <p className="text-xs text-muted-foreground">{item.body}</p>
                    )}
                  </div>
                  {item.type === "REMINDER" && item.action && (
                    <Link
                      href={item.action.href}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
                    >
                      {item.action.label}
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Upcoming</h2>
          {upcoming.map((item, i) =>
            item.type === "UPCOMING" ? (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  <p className="text-sm">{item.title}</p>
                </CardContent>
              </Card>
            ) : null,
          )}
        </section>
      )}

      {activity.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Recent activity</h2>
          <div className="space-y-2">
            {activity.map((item) =>
              item.type === "ACTIVITY" ? (
                <Card key={item.id} className="hover:shadow-sm">
                  <CardContent className="p-0">
                    <Link
                      href={`/timeline/${item.id}`}
                      className="flex min-w-0 items-center gap-3 p-3"
                    >
                      <Activity className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="min-w-0 flex-1 truncate text-sm">{item.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatShortDate(item.occurredAt)}
                      </span>
                    </Link>
                  </CardContent>
                </Card>
              ) : null,
            )}
          </div>
        </section>
      )}
    </div>
  );
}
