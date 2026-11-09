import { ClaimStatus, Prisma, WorkEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { resolveClaimStatus, statusFromEvents } from "@/lib/claim-status";

export { resolveClaimStatus, statusFromEvents };



type DbClient = Prisma.TransactionClient | typeof prisma;

const CLAIM_RECORD_TYPES = new Set<WorkEventType>([
  WorkEventType.NIGHT_DUTY_RECORDED,
  WorkEventType.TRAVEL_RECORDED,
]);

const STATUS_EVENT_TYPES: WorkEventType[] = [
  WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
  WorkEventType.BILL_SUBMITTED,
  WorkEventType.CLAIM_PASSED,
  WorkEventType.PAYMENT_RECEIVED,
  WorkEventType.STATUS_CHANGED,
];

export const claimStatusService = {
  async getStatus(
    claimEventId: string,
    db: DbClient = prisma,
  ): Promise<ClaimStatus> {
    const root = await db.workEvent.findFirst({
      where: { id: claimEventId, voidedAt: null },
      select: { id: true, eventType: true, parentEventId: true, recordedAt: true },
    });
    if (!root) return ClaimStatus.VOIDED;

    if (
      CLAIM_RECORD_TYPES.has(root.eventType) &&
      root.parentEventId
    ) {
      const monthStatus = await this.getStatus(root.parentEventId, db);
      if (monthStatus === ClaimStatus.PAID) return monthStatus;
      // A month reopened for a supplementary bill: entries that were already
      // in it when it was paid stay paid.
      const paidAfter = await db.workEvent.findFirst({
        where: {
          parentEventId: root.parentEventId,
          eventType: WorkEventType.PAYMENT_RECEIVED,
          voidedAt: null,
          recordedAt: { gt: root.recordedAt },
        },
        select: { id: true },
      });
      return paidAfter ? ClaimStatus.PAID : monthStatus;
    }

    return this.replayStatus(root.id, db);
  },

  async replayStatus(
    claimEventId: string,
    db: DbClient = prisma,
  ): Promise<ClaimStatus> {
    const children = await db.workEvent.findMany({
      where: {
        OR: [{ id: claimEventId }, { parentEventId: claimEventId }],
        voidedAt: null,
      },
      orderBy: { recordedAt: "asc" },
    });
    return statusFromEvents(claimEventId, children);
  },

  /**
   * Statuses for many claim entries at once (same answers as `getStatus`).
   * One query for every settlement involved, instead of several per entry.
   */
  async getStatuses(
    claims: { id: string; parentEventId: string | null; recordedAt: Date }[],
    db: DbClient = prisma,
  ): Promise<Map<string, ClaimStatus>> {
    // Entries billed monthly take their status from the settlement; older
    // standalone entries carry their own.
    const owners = new Set(claims.map((c) => c.parentEventId ?? c.id));
    const ownerIds = [...owners];
    const events =
      ownerIds.length === 0
        ? []
        : await db.workEvent.findMany({
            where: {
              voidedAt: null,
              OR: [
                { id: { in: ownerIds } },
                {
                  parentEventId: { in: ownerIds },
                  eventType: { in: STATUS_EVENT_TYPES },
                },
              ],
            },
            orderBy: { recordedAt: "asc" },
          });

    const byOwner = new Map<string, typeof events>();
    for (const event of events) {
      const owner = owners.has(event.id) ? event.id : event.parentEventId;
      if (!owner) continue;
      (byOwner.get(owner) ?? byOwner.set(owner, []).get(owner)!).push(event);
    }

    const result = new Map<string, ClaimStatus>();
    for (const claim of claims) {
      if (!claim.parentEventId) {
        result.set(claim.id, statusFromEvents(claim.id, byOwner.get(claim.id) ?? []));
        continue;
      }
      const group = byOwner.get(claim.parentEventId) ?? [];
      const settlementAlive = group.some((e) => e.id === claim.parentEventId);
      const monthStatus = settlementAlive
        ? statusFromEvents(claim.parentEventId, group)
        : ClaimStatus.VOIDED;
      result.set(claim.id, resolveClaimStatus(monthStatus, claim.recordedAt, group));
    }
    return result;
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
