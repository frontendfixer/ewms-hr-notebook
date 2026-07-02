import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { StatusTimeline } from "@/components/status/status-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteEventButton } from "@/components/timeline/delete-event-button";
import { claimStatusBadge } from "@/components/ui/badge";
import { formatDate, cn } from "@/lib/utils";
import { DOMAIN_LABELS } from "@/lib/design-tokens";
import { domainCardClass, domainLabelClass } from "@/lib/domain-styles";
import { WorkEventType } from "@/generated/prisma/client";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const userId = await requireUserId();
  const { eventId } = await params;

  const event = await prisma.workEvent.findFirst({
    where: { id: eventId, userId, voidedAt: null },
    include: {
      childEvents: { where: { voidedAt: null }, orderBy: { recordedAt: "asc" } },
      ledgerEntries: true,
      parentEvent: true,
    },
  });

  if (!event) notFound();

  const isClaim =
    event.eventType === WorkEventType.NIGHT_DUTY_RECORDED ||
    event.eventType === WorkEventType.TRAVEL_RECORDED;

  const isSettlement =
    event.eventType === WorkEventType.MONTHLY_CLAIM_SETTLEMENT;

  const status =
    isClaim || isSettlement
      ? await claimStatusService.getStatus(event.id)
      : null;

  const monthlySettlement =
    isClaim && event.parentEvent &&
    event.parentEvent.voidedAt == null &&
    event.parentEvent.eventType === WorkEventType.MONTHLY_CLAIM_SETTLEMENT
      ? event.parentEvent
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className={cn("rounded-xl p-4", domainCardClass(event.domain))}>
        <p className={cn("text-sm font-medium", domainLabelClass(event.domain))}>
          {DOMAIN_LABELS[event.domain]}
        </p>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(event.occurredAt)}
        </p>
        {isClaim && status && (
          <div className="mt-2">{claimStatusBadge(status)}</div>
        )}
      </div>

      {event.remarks && (
        <Card>
          <CardContent className="p-4 text-sm">{event.remarks}</CardContent>
        </Card>
      )}

      {monthlySettlement && status && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 text-sm">
            <p className="text-muted-foreground">
              Settlement is managed monthly for {monthlySettlement.title}.
            </p>
            <Link
              href={`/claims/${monthlySettlement.id}`}
              className="font-medium text-primary hover:underline"
            >
              View monthly settlement →
            </Link>
          </CardContent>
        </Card>
      )}

      {isSettlement && status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Claim Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTimeline claimEventId={event.id} currentStatus={status} />
          </CardContent>
        </Card>
      )}

      {event.ledgerEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ledger Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {event.ledgerEntries.map((le) => (
              <p key={le.id}>
                {le.account}: {Number(le.amount) > 0 ? "+" : ""}
                {Number(le.amount)}
                {le.expiresAt && ` (expires ${formatDate(le.expiresAt)})`}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {event.childEvents.length > 0 && !isSettlement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {event.childEvents.map((c) => (
              <p key={c.id}>{c.title}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <DeleteEventButton eventId={event.id} redirectTo="/timeline" />
    </div>
  );
}
