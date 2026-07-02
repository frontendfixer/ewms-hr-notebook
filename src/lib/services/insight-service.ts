import { ClaimStatus, WorkEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isSunday } from "@/lib/utils";
import { format } from "date-fns";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";

export type MonthStats = {
  cr: number;
  leave: number;
  nightDuty: number;
  travel: number;
  total: number;
  pendingAmount: number;
};

export type YearToDateStats = {
  nightDuty: number;
  travel: number;
  crCredits: number;
  leaveRecords: number;
};

export type InsightsData = {
  monthLabel: string;
  thisMonth: MonthStats;
  sundaysWorkedThisYear: number;
  mostVisited: string | null;
  mostVisitedCount: number;
  avgNightDutyPerMonth: number;
  yearToDate: YearToDateStats;
};

export const insightService = {
  async getInsights(userId: string): Promise<InsightsData> {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const events = await prisma.workEvent.findMany({
      where: {
        userId,
        voidedAt: null,
        occurredAt: { gte: yearStart },
      },
    });

    let sundaysWorked = 0;
    const destinations: Record<string, number> = {};
    const thisMonth: MonthStats = {
      cr: 0,
      leave: 0,
      nightDuty: 0,
      travel: 0,
      total: 0,
      pendingAmount: 0,
    };
    const yearToDate: YearToDateStats = {
      nightDuty: 0,
      travel: 0,
      crCredits: 0,
      leaveRecords: 0,
    };

    for (const e of events) {
      const inMonth = e.occurredAt >= monthStart;

      if (e.eventType === WorkEventType.HOLIDAY_WORK_RECORDED && isSunday(e.occurredAt)) {
        sundaysWorked++;
      }

      if (e.eventType === WorkEventType.CR_CREDIT_ISSUED) {
        yearToDate.crCredits++;
        if (inMonth) thisMonth.cr++;
      }

      if (e.eventType === WorkEventType.LEAVE_RECORDED) {
        yearToDate.leaveRecords++;
        if (inMonth) thisMonth.leave++;
      }

      if (e.eventType === WorkEventType.NIGHT_DUTY_RECORDED) {
        yearToDate.nightDuty++;
        if (inMonth) thisMonth.nightDuty++;
      }

      if (e.eventType === WorkEventType.TRAVEL_RECORDED) {
        yearToDate.travel++;
        const p = e.payload as { to?: string };
        if (p.to) destinations[p.to] = (destinations[p.to] ?? 0) + 1;
        if (inMonth) thisMonth.travel++;
      }
    }

    const monthSettlements = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
        voidedAt: null,
        occurredAt: { gte: monthStart, lt: nextMonthStart },
      },
    });
    for (const settlement of monthSettlements) {
      const status = await claimStatusService.getStatus(settlement.id);
      if (status !== ClaimStatus.PAID && status !== ClaimStatus.VOIDED) {
        thisMonth.pendingAmount += await monthlyClaimService.getSettlementTotal(
          settlement.id,
        );
      }
    }

    const orphanClaims = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: {
          in: [WorkEventType.NIGHT_DUTY_RECORDED, WorkEventType.TRAVEL_RECORDED],
        },
        parentEventId: null,
        voidedAt: null,
        occurredAt: { gte: monthStart, lt: nextMonthStart },
      },
    });
    for (const claim of orphanClaims) {
      const status = await claimStatusService.getStatus(claim.id);
      const payload = claim.payload as { amount?: number };
      if (status !== ClaimStatus.PAID && status !== ClaimStatus.VOIDED) {
        thisMonth.pendingAmount += payload.amount ?? 0;
      }
    }

    thisMonth.total =
      thisMonth.cr + thisMonth.leave + thisMonth.nightDuty + thisMonth.travel;

    const topDestination = Object.entries(destinations).sort(
      (a, b) => b[1] - a[1],
    )[0];

    const monthsElapsed = Math.max(1, now.getMonth() + 1);
    const avgNightDutyPerMonth =
      Math.round((yearToDate.nightDuty / monthsElapsed) * 10) / 10;

    return {
      monthLabel: format(now, "MMMM yyyy"),
      thisMonth,
      sundaysWorkedThisYear: sundaysWorked,
      mostVisited: topDestination?.[0] ?? null,
      mostVisitedCount: topDestination?.[1] ?? 0,
      avgNightDutyPerMonth,
      yearToDate,
    };
  },

  async getMonthlyReport(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const events = await prisma.workEvent.findMany({
      where: {
        userId,
        voidedAt: null,
        occurredAt: { gte: start, lte: end },
      },
    });

    const byDomain: Record<string, number> = {};
    for (const e of events) {
      byDomain[e.domain] = (byDomain[e.domain] ?? 0) + 1;
    }
    return { events, byDomain, start, end };
  },
};
