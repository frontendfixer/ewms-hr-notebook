import type { EventDomain } from "@/generated/prisma/client";
import { EventRow } from "@/components/timeline/event-row";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { eventService, type CrUsage } from "@/lib/services/event-service";
import { summarizeEvent } from "@/lib/event-summary";
import { requireUserId } from "@/lib/auth-server";
import { editLockReason } from "@/lib/edit-rules";

type EventCardProps = {
  id: string;
  title: string;
  domain: EventDomain;
  occurredAt: Date;
  payload: unknown;
  eventType: string;
  remarks?: string | null;
  /** Pass these when rendering a list, to skip the per-row lookups. */
  claimStatus?: string | null;
  crUsage?: CrUsage | null;
};

const CLAIM_TYPES = new Set(["NIGHT_DUTY_RECORDED", "TRAVEL_RECORDED"]);

/** One entry as a row. Looks up its claim status / CR usage unless the caller supplied them. */
export async function EventCard({
  id,
  title,
  domain,
  occurredAt,
  payload,
  eventType,
  remarks,
  claimStatus,
  crUsage,
}: EventCardProps) {
  if (claimStatus === undefined) {
    claimStatus = CLAIM_TYPES.has(eventType)
      ? await claimStatusService.getStatus(id)
      : null;
  }
  if (crUsage === undefined) {
    crUsage =
      eventType === "CR_CREDIT_ISSUED"
        ? ((await eventService.getCrUsageForRequest(await requireUserId())).get(id) ?? null)
        : null;
  }

  const summary = summarizeEvent(
    { domain, eventType, title, occurredAt, remarks, payload },
    { claimStatus, crUsage },
  );
  const editable =
    editLockReason({
      eventType,
      claimStatus,
      crUsedBy: crUsage ? "a leave" : null,
    }) === null;

  return (
    <EventRow id={id} domain={domain} summary={summary} editable={editable} />
  );
}
