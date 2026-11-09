// Pure claim-status rules, kept free of database imports so they can be unit tested.
import { ClaimStatus, WorkEventType } from "@/generated/prisma/client";

export type StatusEvent = {
  id: string;
  eventType: WorkEventType;
  payload: unknown;
  recordedAt: Date;
};

/** Replays a claim's status from its own event and the status steps under it (oldest first). */
export function statusFromEvents(
  claimEventId: string,
  events: StatusEvent[],
): ClaimStatus {
  let status: ClaimStatus = ClaimStatus.DRAFT;
  for (const event of events) {
    if (event.eventType === WorkEventType.PAYMENT_RECEIVED) {
      status = ClaimStatus.PAID;
    } else if (event.eventType === WorkEventType.CLAIM_PASSED) {
      status = ClaimStatus.PASSED;
    } else if (event.eventType === WorkEventType.BILL_SUBMITTED) {
      status = ClaimStatus.BILL_SUBMITTED;
    } else if (event.eventType === WorkEventType.STATUS_CHANGED) {
      const p = event.payload as { to?: ClaimStatus };
      if (p.to) status = p.to;
    } else if (
      (event.eventType === WorkEventType.NIGHT_DUTY_RECORDED ||
        event.eventType === WorkEventType.TRAVEL_RECORDED ||
        event.eventType === WorkEventType.MONTHLY_CLAIM_SETTLEMENT) &&
      event.id === claimEventId
    ) {
      const p = event.payload as { currentStatus?: ClaimStatus };
      if (p.currentStatus) status = p.currentStatus;
    }
  }
  return status;
}

/**
 * An entry in a month that was reopened for a supplementary bill stays Paid
 * if a payment was recorded after the entry was added.
 */
export function resolveClaimStatus(
  monthStatus: ClaimStatus,
  entryRecordedAt: Date,
  settlementEvents: StatusEvent[],
): ClaimStatus {
  if (monthStatus === ClaimStatus.PAID) return monthStatus;
  const paidAfter = settlementEvents.some(
    (e) =>
      e.eventType === WorkEventType.PAYMENT_RECEIVED &&
      e.recordedAt > entryRecordedAt,
  );
  return paidAfter ? ClaimStatus.PAID : monthStatus;
}
