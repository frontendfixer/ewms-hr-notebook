import { WorkEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isSunday } from "@/lib/utils";
import { format } from "date-fns";

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
      const payload = e.payload as { amount?: number; currentStatus?: string };

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
        if (inMonth) {
          thisMonth.nightDuty++;
          if (payload.currentStatus !== "PAID" && payload.amount) {
            thisMonth.pendingAmount += payload.amount;
          }
        }
      }

      if (e.eventType === WorkEventType.TRAVEL_RECORDED) {
        yearToDate.travel++;
        const p = e.payload as { to?: string; amount?: number; currentStatus?: string };
        if (p.to) destinations[p.to] = (destinations[p.to] ?? 0) + 1;
        if (inMonth) {
          thisMonth.travel++;
          if (p.currentStatus !== "PAID" && p.amount) {
            thisMonth.pendingAmount += p.amount;
          }
        }
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
