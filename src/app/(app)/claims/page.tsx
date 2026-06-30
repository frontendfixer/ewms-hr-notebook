import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { WorkEventType, ClaimStatus } from "@/generated/prisma/client";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { EventCard } from "@/components/timeline/event-card";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export default async function ClaimsPage() {
  const userId = await requireUserId();
  const claims = await prisma.workEvent.findMany({
    where: {
      userId,
      voidedAt: null,
      eventType: {
        in: [WorkEventType.NIGHT_DUTY_RECORDED, WorkEventType.TRAVEL_RECORDED],
      },
    },
    orderBy: { occurredAt: "desc" },
  });

  let pendingTotal = 0;
  const pending = [];
  for (const c of claims) {
    const status = await claimStatusService.getStatus(c.id);
    const amount = (c.payload as { amount?: number }).amount ?? 0;
    if (status !== ClaimStatus.PAID && status !== ClaimStatus.VOIDED) {
      pendingTotal += amount;
      pending.push({ ...c, status });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Claims</h1>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Pending money</p>
          <p className="text-2xl font-bold">{formatCurrency(pendingTotal)}</p>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {pending.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            All claims paid!
          </p>
        ) : (
          pending.map((e) => (
            <EventCard
              key={e.id}
              id={e.id}
              title={e.title}
              domain={e.domain}
              occurredAt={e.occurredAt}
              payload={e.payload}
              eventType={e.eventType}
            />
          ))
        )}
      </div>
    </div>
  );
}
