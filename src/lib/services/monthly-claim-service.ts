import {
  ClaimStatus,
  Prisma,
  WorkEventType,
} from "@/generated/prisma/client";
import { INTERACTIVE_TX_OPTIONS, prisma } from "@/lib/db";
import { claimStatusService } from "@/lib/services/claim-status-service";
import {
  aggregateChildStatuses,
  addToStatusBreakdown,
  aggregateDomainClaims,
  emptyStatusBreakdown,
  getMonthKey,
  settlementCorrelationId,
  settlementTitle,
  type ClaimDomainSegment,
  type ClaimSettlementDomain,
  type ClaimStatusBreakdown,
  type ClaimStatusSegment,
} from "@/lib/services/monthly-claim-utils";

export {
  aggregateChildStatuses,
  addToStatusBreakdown,
  aggregateDomainClaims,
  emptyStatusBreakdown,
  getMonthKey,
  settlementCorrelationId,
  settlementTitle,
} from "@/lib/services/monthly-claim-utils";
export type {
  ClaimDomainSegment,
  ClaimSettlementDomain,
  ClaimStatusBreakdown,
  ClaimStatusSegment,
  MonthKey,
} from "@/lib/services/monthly-claim-utils";

export type PassedAwaitingSettlement = {
  id: string;
  title: string;
  domain: ClaimSettlementDomain;
  total: number;
  childCount: number;
  status: ClaimStatus;
};

export type ClaimPageStats = {
  year: number;
  yearLabel: string;
  totalAmount: number;
  totalEntries: number;
  travel: ClaimDomainSegment;
  nightDuty: ClaimDomainSegment;
  byStatus: ClaimStatusBreakdown;
  passedAwaitingPayment: {
    totalAmount: number;
    settlementCount: number;
    settlements: PassedAwaitingSettlement[];
  };
};

type DbClient = Prisma.TransactionClient | typeof prisma;

const CLAIM_EVENT_TYPES = [
  WorkEventType.NIGHT_DUTY_RECORDED,
  WorkEventType.TRAVEL_RECORDED,
] as const;

export const monthlyClaimService = {
  async findOrCreateSettlement(
    userId: string,
    domain: ClaimSettlementDomain,
    year: number,
    month: number,
    db: DbClient = prisma,
  ) {
    const correlationId = settlementCorrelationId(domain, year, month);
    const existing = await db.workEvent.findFirst({
      where: {
        userId,
        correlationId,
        eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
        voidedAt: null,
      },
    });
    if (existing) return existing;

    return db.workEvent.create({
      data: {
        userId,
        eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
        domain,
        occurredAt: new Date(year, month - 1, 1),
        title: settlementTitle(domain, year, month),
        correlationId,
        payload: {
          year,
          month,
          currentStatus: ClaimStatus.DRAFT,
        },
      },
    });
  },

  async attachClaimToSettlement(
    userId: string,
    claimEventId: string,
    db: DbClient = prisma,
  ) {
    const claim = await db.workEvent.findFirst({
      where: { id: claimEventId, userId, voidedAt: null },
    });
    if (
      !claim ||
      (claim.eventType !== WorkEventType.NIGHT_DUTY_RECORDED &&
        claim.eventType !== WorkEventType.TRAVEL_RECORDED)
    ) {
      throw new Error("Invalid claim event");
    }

    const { year, month } = getMonthKey(claim.occurredAt);
    const domain = claim.domain as ClaimSettlementDomain;
    const settlement = await this.findOrCreateSettlement(
      userId,
      domain,
      year,
      month,
      db,
    );

    await db.workEvent.update({
      where: { id: claimEventId },
      data: { parentEventId: settlement.id },
    });

    await this.reopenIfPaid(settlement.id, db);
    return settlement;
  },

  async getSettlementTotal(settlementId: string, db: DbClient = prisma) {
    const children = await db.workEvent.findMany({
      where: {
        parentEventId: settlementId,
        eventType: { in: [...CLAIM_EVENT_TYPES] },
        voidedAt: null,
      },
    });
    return children.reduce((sum, child) => {
      const amount = (child.payload as { amount?: number }).amount ?? 0;
      return sum + amount;
    }, 0);
  },

  async getSettlementChildren(settlementId: string, db: DbClient = prisma) {
    return db.workEvent.findMany({
      where: {
        parentEventId: settlementId,
        eventType: { in: [...CLAIM_EVENT_TYPES] },
        voidedAt: null,
      },
      orderBy: { occurredAt: "desc" },
    });
  },

  async listPendingSettlements(userId: string) {
    const settlements = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
        voidedAt: null,
      },
      orderBy: { occurredAt: "desc" },
    });

    const result = [];
    for (const settlement of settlements) {
      const status = await claimStatusService.getStatus(settlement.id);
      const total = await this.getSettlementTotal(settlement.id);
      const children = await this.getSettlementChildren(settlement.id);
      if (
        status !== ClaimStatus.PAID &&
        status !== ClaimStatus.VOIDED &&
        children.length > 0
      ) {
        result.push({
          ...settlement,
          status,
          total,
          childCount: children.length,
        });
      }
    }
    return result;
  },

  async getClaimPageStats(userId: string): Promise<ClaimPageStats> {
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const [yearClaims, settlements] = await Promise.all([
      prisma.workEvent.findMany({
        where: {
          userId,
          eventType: { in: [...CLAIM_EVENT_TYPES] },
          voidedAt: null,
          occurredAt: { gte: yearStart, lte: yearEnd },
        },
      }),
      prisma.workEvent.findMany({
        where: {
          userId,
          eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
          voidedAt: null,
        },
        orderBy: { occurredAt: "desc" },
      }),
    ]);

    const domainStats = aggregateDomainClaims(
      yearClaims.map((claim) => ({
        eventType: claim.eventType,
        amount: (claim.payload as { amount?: number }).amount ?? 0,
      })),
    );

    let byStatus = emptyStatusBreakdown();
    const passedSettlements: PassedAwaitingSettlement[] = [];

    for (const settlement of settlements) {
      const status = await claimStatusService.getStatus(settlement.id);
      const total = await this.getSettlementTotal(settlement.id);
      const children = await this.getSettlementChildren(settlement.id);
      if (children.length === 0) continue;

      const settlementYear = settlement.occurredAt.getFullYear();
      if (settlementYear === year) {
        byStatus = addToStatusBreakdown(byStatus, status, total);
      }

      if (status === ClaimStatus.PASSED) {
        passedSettlements.push({
          id: settlement.id,
          title: settlement.title,
          domain: settlement.domain as ClaimSettlementDomain,
          total,
          childCount: children.length,
          status,
        });
      }
    }

    return {
      year,
      yearLabel: String(year),
      totalAmount: domainStats.travel.amount + domainStats.nightDuty.amount,
      totalEntries: domainStats.totalEntries,
      travel: domainStats.travel,
      nightDuty: domainStats.nightDuty,
      byStatus,
      passedAwaitingPayment: {
        totalAmount: passedSettlements.reduce((sum, s) => sum + s.total, 0),
        settlementCount: passedSettlements.length,
        settlements: passedSettlements,
      },
    };
  },

  async reopenIfPaid(settlementId: string, db: DbClient = prisma) {
    const status = await claimStatusService.getStatus(settlementId);
    if (status !== ClaimStatus.PAID) return;

    const settlement = await db.workEvent.findFirst({
      where: { id: settlementId, voidedAt: null },
    });
    if (!settlement) return;

    const existingPayload = settlement.payload as Prisma.JsonObject;
    await db.workEvent.update({
      where: { id: settlementId },
      data: {
        payload: {
          ...existingPayload,
          currentStatus: ClaimStatus.DRAFT,
        },
      },
    });
  },

  async backfillMonthlySettlements(userId?: string) {
    const users = userId
      ? [{ id: userId }]
      : await prisma.user.findMany({ select: { id: true } });

    let groupsCreated = 0;
    let claimsAttached = 0;

    for (const user of users) {
      const orphanClaims = await prisma.workEvent.findMany({
        where: {
          userId: user.id,
          eventType: { in: [...CLAIM_EVENT_TYPES] },
          parentEventId: null,
          voidedAt: null,
        },
        orderBy: { occurredAt: "asc" },
      });

      const groups = new Map<
        string,
        {
          domain: ClaimSettlementDomain;
          year: number;
          month: number;
          claims: typeof orphanClaims;
        }
      >();

      for (const claim of orphanClaims) {
        const { year, month } = getMonthKey(claim.occurredAt);
        const domain = claim.domain as ClaimSettlementDomain;
        const key = settlementCorrelationId(domain, year, month);
        const group = groups.get(key) ?? {
          domain,
          year,
          month,
          claims: [],
        };
        group.claims.push(claim);
        groups.set(key, group);
      }

      for (const group of groups.values()) {
        await prisma.$transaction(async (tx) => {
          const settlement = await this.findOrCreateSettlement(
            user.id,
            group.domain,
            group.year,
            group.month,
            tx,
          );

          const childStatuses: ClaimStatus[] = [];
          for (const claim of group.claims) {
            childStatuses.push(await claimStatusService.replayStatus(claim.id));
            await tx.workEvent.update({
              where: { id: claim.id },
              data: { parentEventId: settlement.id },
            });
            claimsAttached++;
          }

          const aggregated = aggregateChildStatuses(childStatuses);
          const existingPayload = settlement.payload as Prisma.JsonObject;
          await tx.workEvent.update({
            where: { id: settlement.id },
            data: {
              payload: {
                ...existingPayload,
                currentStatus: aggregated,
              },
            },
          });
        }, INTERACTIVE_TX_OPTIONS);
        groupsCreated++;
      }
    }

    return { groupsCreated, claimsAttached };
  },
};
