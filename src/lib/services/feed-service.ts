import { ClaimStatus, EventDomain, WorkEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ledgerService } from "@/lib/services/ledger-service";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { leaveAccrualService } from "@/lib/services/leave-accrual-service";
import { getPaySettings } from "@/lib/pay-settings";

export type FeedAction = {
  label: string;
  href: string;
};

export type FeedItem =
  | {
      type: "REMINDER";
      priority: "high" | "normal";
      title: string;
      body?: string;
      action?: FeedAction;
    }
  | {
      type: "SUGGESTION";
      title: string;
      action?: FeedAction;
    }
  | {
      type: "UPCOMING";
      title: string;
      date: Date;
    }
  | {
      type: "ACTIVITY";
      id: string;
      title: string;
      domain: EventDomain;
      occurredAt: Date;
    };

export const feedService = {
  async getFeed(userId: string): Promise<FeedItem[]> {
    const items: FeedItem[] = [];

    const pay = await getPaySettings(userId);
    if (!pay.configured || pay.payLevel == null) {
      items.push({
        type: "REMINDER",
        priority: "high",
        title: "Add your pay level and basic pay",
        body: "Needed to work out night duty allowance and daily allowance.",
        action: { label: "Settings", href: "/settings" },
      });
    }

    const crCredits = await ledgerService.getAvailableCrCredits(userId);
    const now = new Date();
    for (const cr of crCredits) {
      if (!cr.expiresAt) continue;
      const daysLeft = Math.ceil(
        (cr.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft <= 14 && daysLeft > 0) {
        items.push({
          type: "REMINDER",
          priority: daysLeft <= 7 ? "high" : "normal",
          title: `CR earned ${cr.earnedAt ? formatDate(cr.earnedAt) : ""} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          action: {
            label: "Use It",
            href: `/add/leave?mode=cr&cr=${cr.creditEventId}`,
          },
        });
      }
    }

    const pendingSettlements = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
        voidedAt: null,
      },
      take: 10,
      orderBy: { occurredAt: "desc" },
    });

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    for (const settlement of pendingSettlements) {
      const summary = await monthlyClaimService.getSettlementSummary(settlement.id);
      if (summary.total <= 0) continue;
      if (
        summary.status === ClaimStatus.BILL_SUBMITTED ||
        summary.status === ClaimStatus.PASSED
      ) {
        items.push({
          type: "REMINDER",
          priority: "normal",
          title: `${settlement.title} is awaiting payment`,
          body: formatCurrency(summary.outstanding),
          action: {
            label: "Update Status",
            href: `/claims/${settlement.id}`,
          },
        });
      } else if (
        summary.status === ClaimStatus.DRAFT &&
        summary.outstanding > 0 &&
        settlement.occurredAt < currentMonthStart
      ) {
        items.push({
          type: "REMINDER",
          priority: "normal",
          title:
            summary.paid > 0
              ? `${settlement.title} has new entries to bill`
              : `${settlement.title} is not billed yet`,
          body: `${formatCurrency(summary.outstanding)} to claim`,
          action: { label: "Open", href: `/claims/${settlement.id}` },
        });
      } else if (summary.shortPaid > 0) {
        items.push({
          type: "REMINDER",
          priority: "normal",
          title: `${settlement.title} was short-paid`,
          body: `${formatCurrency(summary.shortPaid)} not received`,
          action: { label: "Open", href: `/claims/${settlement.id}` },
        });
      }
    }

    const nextHoliday = await prisma.publicHoliday.findFirst({
      where: { userId, date: { gte: now } },
      orderBy: { date: "asc" },
    });
    if (nextHoliday) {
      items.push({
        type: "UPCOMING",
        title: `Next holiday: ${nextHoliday.name}`,
        date: nextHoliday.date,
      });
    }

    const recent = await prisma.workEvent.findMany({
      where: {
        userId,
        voidedAt: null,
        eventType: {
          in: [
            WorkEventType.LEAVE_RECORDED,
            WorkEventType.TRAVEL_RECORDED,
            WorkEventType.NIGHT_DUTY_RECORDED,
            WorkEventType.CR_CREDIT_ISSUED,
          ],
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 5,
    });

    for (const e of recent) {
      items.push({
        type: "ACTIVITY",
        id: e.id,
        title: e.title,
        domain: e.domain,
        occurredAt: e.occurredAt,
      });
    }

    return items;
  },

  async getBalancesSummary(userId: string) {
    await leaveAccrualService.ensureAccruals(userId);
    const balances = await ledgerService.getBalances(userId);
    const crBalance = await ledgerService.getCrBalance(userId);
    const pendingMoney = await ledgerService.getPendingMoney(userId);
    const leaveBalance =
      (balances.LEAVE_CL ?? 0) +
      (balances.LEAVE_LAP ?? 0) +
      (balances.LEAVE_LHAP ?? 0);

    return {
      crBalance,
      leaveBalance,
      pendingMoney,
      clBalance: balances.LEAVE_CL ?? 0,
      lapBalance: balances.LEAVE_LAP ?? 0,
      lhapBalance: balances.LEAVE_LHAP ?? 0,
    };
  },
};
