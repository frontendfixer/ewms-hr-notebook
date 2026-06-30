import type { EventDomain } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { claimStatusBadge } from "@/components/ui/badge";
import { EventCardShell } from "@/components/timeline/event-card-shell";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { formatEventCardDisplay } from "@/lib/event-card-display";

type EventCardProps = {
  id: string;
  title: string;
  domain: EventDomain;
  occurredAt: Date;
  payload: unknown;
  eventType: string;
};

export async function EventCard({
  id,
  title,
  domain,
  occurredAt,
  payload,
  eventType,
}: EventCardProps) {
  const p = payload as {
    from?: string;
    to?: string;
    dayLabel?: string;
    amount?: number;
    expiresAt?: string;
    currentStatus?: string;
    purpose?: string;
  };

  let statusBadge = null;
  if (
    eventType === "NIGHT_DUTY_RECORDED" ||
    eventType === "TRAVEL_RECORDED"
  ) {
    const status = await claimStatusService.getStatus(id);
    statusBadge = claimStatusBadge(status);
  }

  const { headline, subtitle } = formatEventCardDisplay(
    domain,
    title,
    occurredAt,
    p,
    eventType,
  );
  const purpose =
    domain === "TRAVEL" && p.purpose && p.purpose !== p.to ? p.purpose : undefined;
  const showAmount =
    domain === "NIGHT_DUTY" || domain === "TRAVEL" ? p.amount : undefined;

  return (
    <EventCardShell
      id={id}
      domain={domain}
      headline={headline}
      subtitle={subtitle}
      statusBadge={statusBadge}
      amount={showAmount}
      purpose={purpose}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <Card>
      <CardContent className="h-20 animate-pulse bg-muted/50 p-4" />
    </Card>
  );
}
