import { ClaimStatus, EventDomain, WorkEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ledgerService } from "@/lib/services/ledger-service";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { formatDate } from "@/lib/utils";

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
          title: `CR earned ${cr.earnedAt ? formatDate(cr.earnedAt) : ""} expires in ${daysLeft} days`,
          action: {
            label: "Use It",
            href: `/add/leave?mode=cr&cr=${cr.creditEventId}`,
          },
        });
      }
    }

    const pendingClaims = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: {
          in: [WorkEventType.NIGHT_DUTY_RECORDED, WorkEventType.TRAVEL_RECORDED],
        },
        voidedAt: null,
      },
      take: 10,
      orderBy: { occurredAt: "desc" },
    });

    for (const claim of pendingClaims) {
      const status = await claimStatusService.getStatus(claim.id);
      const payload = claim.payload as { to?: string; amount?: number };
      if (
        status === ClaimStatus.BILL_SUBMITTED ||
        status === ClaimStatus.PASSED
      ) {
        items.push({
          type: "REMINDER",
          priority: "normal",
          title: `${claim.title} is awaiting payment`,
          body: payload.amount ? `₹${payload.amount}` : undefined,
          action: {
            label: "Update Status",
            href: `/timeline/${claim.id}`,
          },
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
