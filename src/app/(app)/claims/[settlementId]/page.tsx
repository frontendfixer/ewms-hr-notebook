import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";
import { StatusTimeline } from "@/components/status/status-timeline";
import { EventCard } from "@/components/timeline/event-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { claimStatusBadge } from "@/components/ui/badge";
import { DOMAIN_LABELS } from "@/lib/design-tokens";
import { domainCardClass, domainLabelClass } from "@/lib/domain-styles";
import { formatCurrency, cn } from "@/lib/utils";
import { WorkEventType } from "@/generated/prisma/client";
import { ArrowLeft } from "lucide-react";

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ settlementId: string }>;
}) {
  const userId = await requireUserId();
  const { settlementId } = await params;

  const settlement = await prisma.workEvent.findFirst({
    where: {
      id: settlementId,
      userId,
      eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
      voidedAt: null,
    },
  });

  if (!settlement) notFound();

  const [summary, children, stepDetails] = await Promise.all([
    monthlyClaimService.getSettlementSummary(settlement.id),
    monthlyClaimService.getSettlementChildren(settlement.id),
    monthlyClaimService.getStepDetails(settlement.id),
  ]);
  const { status, total } = summary;
  const { year, month } = settlement.payload as { year: number; month: number };

  const entryLabel =
    settlement.domain === "TRAVEL"
      ? `${children.length} journey${children.length === 1 ? "" : "s"}`
      : `${children.length} night${children.length === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/claims"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Claims
      </Link>

      <div className={cn("rounded-xl p-4", domainCardClass(settlement.domain))}>
        <p className={cn("text-sm font-medium", domainLabelClass(settlement.domain))}>
          {DOMAIN_LABELS[settlement.domain]}
        </p>
        <h1 className="text-2xl font-bold">{settlement.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {claimStatusBadge(status)}
          <span className="text-sm text-muted-foreground">{entryLabel}</span>
          <span className="text-sm font-medium">{formatCurrency(total)}</span>
        </div>
        {summary.paid > 0 && (
          <p className="mt-2 text-sm">
            Received {formatCurrency(summary.paid)}
            {summary.outstanding > 0 && (
              <span className="font-medium text-destructive">
                {" "}
                · {formatCurrency(summary.outstanding)} still due
              </span>
            )}
          </p>
        )}
        <Link
          href={`/reports?month=${year}-${String(month).padStart(2, "0")}`}
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          Statement for this month →
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claim Status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline
            claimEventId={settlement.id}
            currentStatus={status}
            outstanding={summary.outstanding}
            shortPaid={summary.shortPaid}
            stepDetails={stepDetails}
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Entries</h2>
        {children.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries in this month.</p>
        ) : (
          children.map((entry) => (
            <EventCard
              key={entry.id}
              id={entry.id}
              title={entry.title}
              domain={entry.domain}
              occurredAt={entry.occurredAt}
              payload={entry.payload}
              eventType={entry.eventType}
            />
          ))
        )}
      </div>
    </div>
  );
}
