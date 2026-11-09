import { Card } from "@/components/ui/card";
import { DOMAIN_STYLES } from "@/lib/design-tokens";
import type { ClaimsOverview, Stage } from "@/lib/claim-summary";
import { cn, formatCurrencyExact } from "@/lib/utils";
import { Moon, Train } from "lucide-react";

const STAGES: { key: Stage; label: string; bar: string }[] = [
  { key: "DRAFT", label: "Unbilled", bar: "bg-slate-400" },
  { key: "BILL_SUBMITTED", label: "Billed", bar: "bg-amber-500" },
  { key: "PASSED", label: "Passed", bar: "bg-blue-500" },
  { key: "SHORT_PAID", label: "Short-paid", bar: "bg-red-500" },
];

export function ClaimsOverviewCard({ overview }: { overview: ClaimsOverview }) {
  const { due, openBills, stages } = overview;
  const active = STAGES.filter((s) => stages[s.key].amount > 0);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Due to you</p>
          <p className="text-3xl font-bold leading-tight tabular-nums">{formatCurrencyExact(due)}</p>
        </div>
        <span
          className={cn(
            "mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            openBills > 0
              ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          )}
        >
          {openBills > 0 ? `${openBills} open bill${openBills === 1 ? "" : "s"}` : "All settled"}
        </span>
      </div>

      {due > 0 && (
        <div>
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={active.map((s) => `${s.label} ${formatCurrencyExact(stages[s.key].amount)}`).join(", ")}
          >
            {active.map((s) => (
              <span
                key={s.key}
                className={cn("h-full", s.bar)}
                style={{ width: `${(stages[s.key].amount / due) * 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {active.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", s.bar)} aria-hidden />
                <span className="min-w-0 truncate">
                  {s.label}{" "}
                  <b className="font-semibold tabular-nums text-foreground">
                    {formatCurrencyExact(stages[s.key].amount)}
                  </b>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1.5 border-t border-border/60 pt-3 text-xs">
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-muted-foreground">{overview.year} so far</span>
          <span className="text-muted-foreground">
            <b className="font-semibold tabular-nums text-foreground">
              {formatCurrencyExact(overview.yearReceived)}
            </b>{" "}
            received of{" "}
            <b className="font-semibold tabular-nums text-foreground">
              {formatCurrencyExact(overview.yearClaimed)}
            </b>
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["NIGHT_DUTY", "NDA", Moon, overview.nightDuty, "night"],
              ["TRAVEL", "TA", Train, overview.travel, "journey"],
            ] as const
          ).map(([domain, label, Icon, seg, unit]) => (
            <p key={domain} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  DOMAIN_STYLES[domain].icon,
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <b className="block truncate text-sm font-semibold tabular-nums">
                  {formatCurrencyExact(seg.amount)}
                </b>
                <span className="text-muted-foreground">
                  {label} · {seg.count} {unit}
                  {seg.count === 1 ? "" : "s"}
                </span>
              </span>
            </p>
          ))}
        </div>
      </div>
    </Card>
  );
}
