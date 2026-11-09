import Link from "next/link";
import { requireUserId } from "@/lib/auth-server";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";
import { ClaimsOverviewCard } from "@/components/claims/claims-overview";
import { SettlementRow } from "@/components/claims/settlement-row";
import { Card } from "@/components/ui/card";
import {
  buildOverview,
  filterViews,
  groupByMonth,
  parseClaimsFilter,
  type ClaimsFilter,
} from "@/lib/claim-summary";
import { currentReportMonth, monthLabel } from "@/lib/report-summary";
import { cn, formatCurrencyExact } from "@/lib/utils";

const FILTERS: { key: ClaimsFilter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "paid", label: "Paid" },
  { key: "all", label: "All" },
];

const EMPTY: Record<ClaimsFilter, string> = {
  open: "Nothing pending — every claim is paid.",
  paid: "No paid claims yet.",
  all: "No claims yet. Night duty and travel you record show up here, one bill per month.",
};

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const userId = await requireUserId();
  const filter = parseClaimsFilter((await searchParams).view);
  const views = await monthlyClaimService.listSettlementViews(userId);

  const counts: Record<ClaimsFilter, number> = {
    open: filterViews(views, "open").length,
    paid: filterViews(views, "paid").length,
    all: filterViews(views, "all").length,
  };
  const overview = buildOverview(views, currentReportMonth().year);
  const groups = groupByMonth(filterViews(views, filter));

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3">
      <h1 className="px-1 text-lg font-semibold leading-tight">Claims</h1>

      <ClaimsOverviewCard overview={overview} />

      <nav
        aria-label="Show claims"
        className="flex rounded-xl bg-muted p-0.5 text-xs font-medium"
      >
        {FILTERS.map(({ key, label }) => {
          const active = key === filter;
          return (
            <Link
              key={key}
              href={key === "open" ? "/claims" : `/claims?view=${key}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className="tabular-nums text-muted-foreground">{counts[key]}</span>
            </Link>
          );
        })}
      </nav>

      {groups.length === 0 ? (
        <p className="px-2 py-10 text-center text-sm text-muted-foreground">{EMPTY[filter]}</p>
      ) : (
        groups.map((g) => (
          <section key={`${g.year}-${g.month}`} aria-label={monthLabel(g)}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 px-1">
              <h2 className="text-xs font-semibold text-muted-foreground">{monthLabel(g)}</h2>
              {/* Due first: it is the figure that matters, and wrapping beats clipping money. */}
              <p className="text-xs tabular-nums text-muted-foreground">
                {g.outstanding > 0 && (
                  <>
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      {formatCurrencyExact(g.outstanding)} due
                    </span>
                    {" · "}
                  </>
                )}
                {formatCurrencyExact(g.total)} claimed
              </p>
            </div>
            <Card className="divide-y divide-border/60 overflow-hidden">
              {g.views.map((v) => (
                <SettlementRow key={v.id} view={v} />
              ))}
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
