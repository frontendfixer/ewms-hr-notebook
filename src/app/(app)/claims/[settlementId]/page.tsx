import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, FileText, Moon, Train } from "lucide-react";
import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { WorkEventType } from "@/generated/prisma/client";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";
import { StatusTimeline } from "@/components/status/status-timeline";
import { EventCard } from "@/components/timeline/event-card";
import { EventList } from "@/components/timeline/event-row";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CLAIM_PILL_LABELS, CLAIM_STATUS_LABELS, DOMAIN_STYLES, claimStatusVariant } from "@/lib/design-tokens";
import { stepDetails } from "@/lib/claim-summary";
import { formatRange } from "@/lib/event-summary";
import { monthLabel, reportMonthKey } from "@/lib/report-summary";
import { cn, formatCurrencyExact, formatDate } from "@/lib/utils";

const DOMAIN = {
  NIGHT_DUTY: { icon: Moon, label: "Night duty", unit: "night" },
  TRAVEL: { icon: Train, label: "Travel", unit: "journey" },
} as const;

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "due";
}) {
  return (
    // Value above label on screen, label first in the DOM so it reads in order.
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "break-words text-sm font-bold tabular-nums sm:text-base",
          tone === "due" && value > 0 && "text-amber-700 dark:text-amber-300",
        )}
      >
        {formatCurrencyExact(value)}
      </dd>
    </div>
  );
}

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ settlementId: string }>;
}) {
  const userId = await requireUserId();
  const { settlementId } = await params;

  // Find the bill first (this also checks it is the user's own), then load only
  // its month rather than every bill the user has ever had.
  const found = await prisma.workEvent.findFirst({
    where: {
      id: settlementId,
      userId,
      eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
      voidedAt: null,
    },
    select: { payload: true },
  });
  if (!found) notFound();
  const monthViews = await monthlyClaimService.listSettlementViews(
    userId,
    found.payload as { year: number; month: number },
  );
  const view = monthViews.find((v) => v.id === settlementId);
  if (!view) notFound();

  const children = await monthlyClaimService.getSettlementChildren(view.id);
  // Each entry's own status (an entry added after a payment is not paid), in one query.
  const entryStatuses = await claimStatusService.getStatuses(children);
  // The other bill of the same month (night duty <-> travel).
  const sibling = monthViews.find(
    (v) => v.id !== view.id && v.year === view.year && v.month === view.month && v.entryCount > 0,
  );

  const { icon: Icon, label, unit } = DOMAIN[view.domain];
  const styles = DOMAIN_STYLES[view.domain];
  const month = monthLabel(view);
  const SiblingIcon = sibling ? DOMAIN[sibling.domain].icon : null;

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3">
      <header className="flex items-center gap-2 px-1">
        <Link
          href="/claims"
          aria-label="Back to claims"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", styles.icon)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight">{label}</h1>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {month} · {view.entryCount} {unit}
            {view.entryCount === 1 ? "" : "s"}
            {view.firstEntry && view.lastEntry && ` · ${formatRange(view.firstEntry, view.lastEntry)}`}
          </p>
        </div>
        <Badge
          variant={view.shortPaid > 0 ? "critical" : claimStatusVariant(view.status)}
          className="shrink-0 px-2.5 py-0.5 text-xs"
        >
          {view.shortPaid > 0 ? "Short-paid" : (CLAIM_STATUS_LABELS[view.status] ?? view.status)}
        </Badge>
      </header>

      <Card className="space-y-3 p-4">
        <dl className="grid grid-cols-3 gap-3">
          <Figure label="Claimed" value={view.total} />
          <Figure label="Received" value={view.paid} />
          <Figure label={view.shortPaid > 0 ? "Short by" : "Due"} value={view.outstanding} tone="due" />
        </dl>

        {view.shortPaid > 0 && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            Marked paid, but {formatCurrencyExact(view.shortPaid)} less than claimed. Undo the last
            step and record the payment again if the balance arrives.
          </p>
        )}

        {view.payments.length > 0 && (
          <ul className="divide-y divide-border/60 border-t border-border/60 pt-1 text-xs">
            {view.payments.map((p, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="text-muted-foreground">
                  {formatDate(p.at)}
                  {p.reference && ` · ${p.reference}`}
                </span>
                <span className="font-medium tabular-nums">
                  {p.amount != null ? formatCurrencyExact(p.amount) : "Paid in full"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col divide-y divide-border/60 border-t border-border/60 text-sm">
          <Link
            href={`/reports?month=${reportMonthKey(view)}`}
            className="flex min-h-11 items-center gap-2 text-primary hover:underline"
          >
            <FileText className="h-4 w-4" aria-hidden />
            <span className="flex-1">Statement for {month}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
          {sibling && SiblingIcon && (
            <Link
              href={`/claims/${sibling.id}`}
              className="flex min-h-11 items-center gap-2 hover:underline"
            >
              <SiblingIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                Also this month: {DOMAIN[sibling.domain].label} ·{" "}
                {formatCurrencyExact(sibling.total)}
              </span>
              <Badge variant={claimStatusVariant(sibling.status)} className="px-2 py-0 text-[11px]">
                {CLAIM_PILL_LABELS[sibling.status] ?? sibling.status}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </Link>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Status</h2>
        <StatusTimeline
          claimEventId={view.id}
          currentStatus={view.status}
          outstanding={view.outstanding}
          shortPaid={view.shortPaid}
          stepDetails={stepDetails(view)}
        />
      </Card>

      <section aria-label="Entries">
        <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-xs font-semibold text-muted-foreground">
            Entries · {children.length}
          </h2>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatCurrencyExact(view.total)}
          </p>
        </div>
        {children.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">No entries in this month.</p>
        ) : (
          <EventList>
            {children.map((entry) => (
              <EventCard
                key={entry.id}
                id={entry.id}
                title={entry.title}
                domain={entry.domain}
                occurredAt={entry.occurredAt}
                payload={entry.payload}
                eventType={entry.eventType}
                remarks={entry.remarks}
                claimStatus={entryStatuses.get(entry.id) ?? null}
              />
            ))}
          </EventList>
        )}
      </section>
    </div>
  );
}
