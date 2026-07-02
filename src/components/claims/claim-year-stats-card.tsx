import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLAIM_STATUS_LABELS, DOMAIN_STYLES } from "@/lib/design-tokens";
import type { ClaimPageStats } from "@/lib/services/monthly-claim-service";
import { formatCurrency, cn } from "@/lib/utils";
import { Moon, Train } from "lucide-react";

const domainStatConfig = [
  {
    key: "travel" as const,
    label: "Travel",
    icon: Train,
    domain: "TRAVEL" as const,
    unit: "journey",
  },
  {
    key: "nightDuty" as const,
    label: "Night Duty",
    icon: Moon,
    domain: "NIGHT_DUTY" as const,
    unit: "night",
  },
];

const statusStatConfig = [
  { key: "DRAFT" as const, variant: "muted" as const },
  { key: "BILL_SUBMITTED" as const, variant: "warning" as const },
  { key: "PASSED" as const, variant: "info" as const },
  { key: "PAID" as const, variant: "success" as const },
];

export function ClaimYearStatsCard({ stats }: { stats: ClaimPageStats }) {
  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm ring-1 ring-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">This Year</CardTitle>
            <p className="text-xs text-muted-foreground">{stats.yearLabel}</p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {stats.totalEntries} entr{stats.totalEntries === 1 ? "y" : "ies"}
          </div>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
        <p className="text-xs text-muted-foreground">Total claimed this year</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">By type</p>
          <div className="grid grid-cols-2 gap-2">
            {domainStatConfig.map(({ key, label, icon: Icon, domain, unit }) => {
              const segment = stats[key];
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
                    <p className="text-sm font-bold leading-none">
                      {formatCurrency(segment.amount)}
                    </p>
                    <p className={cn("mt-0.5 truncate text-[11px] font-medium", styles.label)}>
                      {segment.count} {unit}
                      {segment.count === 1 ? "" : "s"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">By status</p>
          <div className="grid grid-cols-2 gap-2">
            {statusStatConfig.map(({ key, variant }) => {
              const segment = stats.byStatus[key];
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border p-3",
                    variant === "success" && "border-emerald-500/20 bg-emerald-500/10",
                    variant === "warning" && "border-amber-500/20 bg-amber-500/10",
                    variant === "info" && "border-blue-500/20 bg-blue-500/10",
                    variant === "muted" && "border-border bg-muted/40",
                  )}
                >
                  <p className="text-sm font-bold">{formatCurrency(segment.amount)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {segment.count} settlement{segment.count === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium">
                    {CLAIM_STATUS_LABELS[key]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
