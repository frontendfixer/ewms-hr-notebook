import {
  ClaimStatus,
  LedgerAccount,
  Prisma,
  WorkEventType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

type LedgerDb = Prisma.TransactionClient | typeof prisma;
import { claimStatusService } from "@/lib/services/claim-status-service";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";

export const ledgerService = {
  /** `excludeEventId` leaves out one entry's own postings, e.g. the leave being edited. */
  async getBalances(userId: string, excludeEventId?: string) {
    const entries = await prisma.ledgerEntry.groupBy({
      by: ["account"],
      where: {
        userId,
        ...(excludeEventId ? { NOT: { eventId: excludeEventId } } : {}),
      },
      _sum: { amount: true },
    });
    const map: Record<string, number> = {};
    for (const e of entries) {
      map[e.account] = Number(e._sum.amount ?? 0);
    }
    return map;
  },

  /** CR credits with a positive balance that are still valid on `validOn`. */
  async getAvailableCrCredits(
    userId: string,
    db: LedgerDb = prisma,
    validOn: Date = new Date(),
    excludeEventId?: string,
  ) {
    const credits = await db.ledgerEntry.groupBy({
      by: ["subAccountKey"],
      where: {
        userId,
        account: LedgerAccount.CR_CREDIT,
        subAccountKey: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: validOn } }],
        ...(excludeEventId ? { NOT: { eventId: excludeEventId } } : {}),
      },
      _sum: { amount: true },
      _min: { expiresAt: true, occurredAt: true },
    });

    return credits
      .filter((c) => c.subAccountKey && Number(c._sum.amount ?? 0) > 0)
      .map((c) => ({
        creditEventId: c.subAccountKey!,
        balance: Number(c._sum.amount ?? 0),
        expiresAt: c._min.expiresAt,
        earnedAt: c._min.occurredAt,
      }))
      .sort((a, b) => {
        if (!a.expiresAt) return 1;
        if (!b.expiresAt) return -1;
        return a.expiresAt.getTime() - b.expiresAt.getTime();
      });
  },

  async getCrBalance(userId: string): Promise<number> {
    const credits = await this.getAvailableCrCredits(userId);
    return credits.reduce((sum, c) => sum + c.balance, 0);
  },

  async getPendingMoney(userId: string): Promise<number> {
    const views = await monthlyClaimService.listSettlementViews(userId);
    let total = views.reduce((sum, v) => sum + v.outstanding, 0);

    const orphanClaims = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: {
          in: [WorkEventType.NIGHT_DUTY_RECORDED, WorkEventType.TRAVEL_RECORDED],
        },
        parentEventId: null,
        voidedAt: null,
      },
    });

    for (const claim of orphanClaims) {
      const status = await claimStatusService.getStatus(claim.id);
      if (status !== ClaimStatus.PAID && status !== ClaimStatus.VOIDED) {
        const payload = claim.payload as { amount?: number };
        total += payload.amount ?? 0;
      }
    }

    return Math.round(total * 100) / 100;
  },
};
