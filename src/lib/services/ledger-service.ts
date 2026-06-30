import { ClaimStatus, LedgerAccount, WorkEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { claimStatusService } from "@/lib/services/claim-status-service";

export const ledgerService = {
  async getBalances(userId: string) {
    const entries = await prisma.ledgerEntry.groupBy({
      by: ["account"],
      where: { userId },
      _sum: { amount: true },
    });
    const map: Record<string, number> = {};
    for (const e of entries) {
      map[e.account] = Number(e._sum.amount ?? 0);
    }
    return map;
  },

  async getAvailableCrCredits(userId: string) {
    const now = new Date();
    const credits = await prisma.ledgerEntry.groupBy({
      by: ["subAccountKey"],
      where: {
        userId,
        account: LedgerAccount.CR_CREDIT,
        subAccountKey: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
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
    const claims = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: {
          in: [WorkEventType.NIGHT_DUTY_RECORDED, WorkEventType.TRAVEL_RECORDED],
        },
        voidedAt: null,
      },
    });
    let total = 0;
    for (const claim of claims) {
      const status = await claimStatusService.getStatus(claim.id);
      if (status !== ClaimStatus.PAID && status !== ClaimStatus.VOIDED) {
        const payload = claim.payload as { amount?: number };
        total += payload.amount ?? 0;
      }
    }
    return total;
  },
};
