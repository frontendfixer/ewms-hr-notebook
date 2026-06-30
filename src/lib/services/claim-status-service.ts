import { ClaimStatus, WorkEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const claimStatusService = {
  async getStatus(claimEventId: string): Promise<ClaimStatus> {
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
        event.eventType === WorkEventType.NIGHT_DUTY_RECORDED ||
        event.eventType === WorkEventType.TRAVEL_RECORDED
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
