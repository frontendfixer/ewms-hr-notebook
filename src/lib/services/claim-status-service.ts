import { ClaimStatus, WorkEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const CLAIM_RECORD_TYPES = new Set<WorkEventType>([
  WorkEventType.NIGHT_DUTY_RECORDED,
  WorkEventType.TRAVEL_RECORDED,
]);

export const claimStatusService = {
  async getStatus(claimEventId: string): Promise<ClaimStatus> {
    const root = await prisma.workEvent.findFirst({
      where: { id: claimEventId, voidedAt: null },
      select: { id: true, eventType: true, parentEventId: true },
    });
    if (!root) return ClaimStatus.VOIDED;

    if (
      CLAIM_RECORD_TYPES.has(root.eventType) &&
      root.parentEventId
    ) {
      return this.getStatus(root.parentEventId);
    }

    return this.replayStatus(root.id);
  },

  async replayStatus(claimEventId: string): Promise<ClaimStatus> {
    const children = await prisma.workEvent.findMany({
      where: {
        OR: [{ id: claimEventId }, { parentEventId: claimEventId }],
        voidedAt: null,
      },
      orderBy: { recordedAt: "asc" },
    });

    let status: ClaimStatus = ClaimStatus.DRAFT;
    for (const event of children) {
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
  },

  getNextStatus(current: ClaimStatus): ClaimStatus | null {
    const flow: Record<ClaimStatus, ClaimStatus | null> = {
      DRAFT: ClaimStatus.BILL_SUBMITTED,
      BILL_SUBMITTED: ClaimStatus.PASSED,
      PASSED: ClaimStatus.PAID,
      PAID: null,
      VOIDED: null,
    };
    return flow[current];
  },
};
