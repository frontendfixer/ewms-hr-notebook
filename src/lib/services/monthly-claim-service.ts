import {
  ClaimStatus,
  Prisma,
  WorkEventType,
} from "@/generated/prisma/client";
import { INTERACTIVE_TX_OPTIONS, prisma } from "@/lib/db";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { buildSettlementView, type SettlementView } from "@/lib/claim-summary";
import {
  aggregateChildStatuses,
  getMonthKey,
  settlementCorrelationId,
  settlementTitle,
  type ClaimSettlementDomain,
} from "@/lib/services/monthly-claim-utils";

export {
  aggregateChildStatuses,
  getMonthKey,
  settlementCorrelationId,
  settlementTitle,
} from "@/lib/services/monthly-claim-utils";
export type {
  ClaimSettlementDomain,
  MonthKey,
} from "@/lib/services/monthly-claim-utils";

export type SettlementSummary = {
  status: ClaimStatus;
  total: number;
  /** Sum of amounts recorded on "Paid" status updates. */
  paid: number;
  /** Claimed minus received, never below zero. */
  outstanding: number;
  /** Paid less than claimed after the bill was marked paid. */
  shortPaid: number;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

const CLAIM_EVENT_TYPES = [
  WorkEventType.NIGHT_DUTY_RECORDED,
  WorkEventType.TRAVEL_RECORDED,
] as const;

/** Bill, pass and payment steps (and the fallback status change) recorded under a settlement. */
const STEP_EVENT_TYPES = [
  WorkEventType.BILL_SUBMITTED,
  WorkEventType.CLAIM_PASSED,
  WorkEventType.PAYMENT_RECEIVED,
  WorkEventType.STATUS_CHANGED,
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

  /** Payments recorded against a settlement; legacy payments without an amount count as the full total. */
  async getSettlementPaid(
    settlementId: string,
    total: number,
    db: DbClient = prisma,
  ): Promise<number> {
    const payments = await db.workEvent.findMany({
      where: {
        parentEventId: settlementId,
        eventType: WorkEventType.PAYMENT_RECEIVED,
        voidedAt: null,
      },
    });
    let paid = 0;
    for (const payment of payments) {
      const amount = (payment.payload as { amount?: number }).amount;
      if (amount == null) return total;
      paid += amount;
    }
    return Math.round(paid * 100) / 100;
  },

  async getSettlementSummary(
    settlementId: string,
    db: DbClient = prisma,
  ): Promise<SettlementSummary> {
    const [status, total] = await Promise.all([
      claimStatusService.getStatus(settlementId),
      this.getSettlementTotal(settlementId, db),
    ]);
    if (status === ClaimStatus.VOIDED) {
      return { status, total, paid: 0, outstanding: 0, shortPaid: 0 };
    }
    const paid = await this.getSettlementPaid(settlementId, total, db);
    const outstanding = Math.max(0, Math.round((total - paid) * 100) / 100);
    return {
      status,
      total,
      paid,
      outstanding,
      shortPaid: status === ClaimStatus.PAID ? outstanding : 0,
    };
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

  /**
   * Every monthly bill the user has, with what it is worth, what was received
   * and where it stands. Two queries in all, however many months there are.
   */
  async listSettlementViews(
    userId: string,
    /** Only this month's bills (both types), e.g. for a detail page. */
    only?: { year: number; month: number },
  ): Promise<SettlementView[]> {
    const settlements = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
        voidedAt: null,
        ...(only
          ? {
              correlationId: {
                in: (["NIGHT_DUTY", "TRAVEL"] as const).map((d) =>
                  settlementCorrelationId(d, only.year, only.month),
                ),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: "desc" },
    });
    if (settlements.length === 0) return [];

    const children = await prisma.workEvent.findMany({
      where: {
        parentEventId: { in: settlements.map((x) => x.id) },
        voidedAt: null,
        eventType: { in: [...CLAIM_EVENT_TYPES, ...STEP_EVENT_TYPES] },
      },
      select: {
        id: true,
        parentEventId: true,
        eventType: true,
        payload: true,
        recordedAt: true,
        occurredAt: true,
      },
    });

    const byParent = new Map<string, typeof children>();
    for (const child of children) {
      const list = byParent.get(child.parentEventId!) ?? [];
      list.push(child);
      byParent.set(child.parentEventId!, list);
    }

    return settlements.map((settlement) => {
      const own = byParent.get(settlement.id) ?? [];
      return buildSettlementView({
        settlement,
        steps: own.filter((c) => (STEP_EVENT_TYPES as readonly WorkEventType[]).includes(c.eventType)),
        claims: own.filter((c) => (CLAIM_EVENT_TYPES as readonly WorkEventType[]).includes(c.eventType)),
      });
    });
  },

  /**
   * A new entry in an already-paid month needs a supplementary bill: move the
   * settlement back to DRAFT with a status event so the replay sees it.
   */
  async reopenIfPaid(settlementId: string, db: DbClient = prisma) {
    const status = await claimStatusService.getStatus(settlementId, db);
    if (status !== ClaimStatus.PAID) return;

    const settlement = await db.workEvent.findFirst({
      where: { id: settlementId, voidedAt: null },
    });
    if (!settlement) return;

    await db.workEvent.create({
      data: {
        userId: settlement.userId,
        eventType: WorkEventType.STATUS_CHANGED,
        domain: "META",
        occurredAt: new Date(),
        title: "Status → DRAFT (new entry after payment)",
        parentEventId: settlementId,
        payload: {
          from: ClaimStatus.PAID,
          to: ClaimStatus.DRAFT,
          claimEventId: settlementId,
          reason: "supplementary",
        },
      },
    });

    const existingPayload = settlement.payload as Prisma.JsonObject;
    await db.workEvent.update({
      where: { id: settlementId },
      data: {
        payload: { ...existingPayload, currentStatus: ClaimStatus.DRAFT },
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
