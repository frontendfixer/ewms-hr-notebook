import { LedgerAccount, WorkEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ledgerService } from "@/lib/services/ledger-service";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";
import { settlementCorrelationId } from "@/lib/services/monthly-claim-utils";
import { LEAVE_TYPE_SHORT_LABELS } from "@/lib/leave-types";
import type { LeaveType } from "@/generated/prisma/client";
import { formatShortDate } from "@/lib/utils";

import { financialYearOf, fyMonthSeries, parseReportMonth, reportMonthKey } from "@/lib/report-summary";
import type { ReportMonth } from "@/lib/report-types";

export type { ReportMonth };

export type NdaRow = {
  date: Date;
  duty: string;
  nightHours: number;
  weightageHours: number;
  hourlyRate: number;
  daPercent: number | null;
  amount: number;
  remarks: string | null;
};

export type TaRow = {
  date: Date;
  route: string;
  purpose: string;
  away: string;
  claimPercent: number;
  dailyRate: number;
  amount: number;
  remarks: string | null;
};

export type CrRow = {
  workDate: Date;
  dayLabel: string;
  earned: number;
  expiresAt: Date | null;
  used: number;
  balance: number;
  status: "Available" | "Used" | "Partly used" | "Expired";
};

export type LeaveRow = {
  type: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string | null;
};

export type SettlementInfo = {
  id: string;
  status: string;
  total: number;
  paid: number;
  outstanding: number;
} | null;

export type MonthlyStatement = {
  month: ReportMonth;
  nda: { rows: NdaRow[]; total: number; settlement: SettlementInfo };
  ta: { rows: TaRow[]; total: number; settlement: SettlementInfo };
  cr: CrRow[];
  leave: LeaveRow[];
  balances: { cr: number; cl: number; lap: number; lhap: number };
};

export { parseReportMonth, reportMonthKey, financialYearOf };

function monthRange({ year, month }: ReportMonth) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

async function settlementInfo(
  userId: string,
  domain: "NIGHT_DUTY" | "TRAVEL",
  m: ReportMonth,
): Promise<SettlementInfo> {
  const settlement = await prisma.workEvent.findFirst({
    where: {
      userId,
      correlationId: settlementCorrelationId(domain, m.year, m.month),
      eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
      voidedAt: null,
    },
  });
  if (!settlement) return null;
  const s = await monthlyClaimService.getSettlementSummary(settlement.id);
  return { id: settlement.id, status: s.status, total: s.total, paid: s.paid, outstanding: s.outstanding };
}

function awayLabel(
  journeyDate: Date,
  returnDate: string | undefined,
  dep: string | null | undefined,
  ret: string | null | undefined,
): string {
  if (!dep || !ret) return "";
  const back = returnDate ? new Date(returnDate) : journeyDate;
  if (back.getTime() === journeyDate.getTime()) return `${dep}–${ret}`;
  return `${formatShortDate(journeyDate)} ${dep} – ${formatShortDate(back)} ${ret}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const reportService = {
  async getMonthlyStatement(userId: string, m: ReportMonth): Promise<MonthlyStatement> {
    const { start, end } = monthRange(m);
    const events = await prisma.workEvent.findMany({
      where: {
        userId,
        voidedAt: null,
        occurredAt: { gte: start, lte: end },
        eventType: {
          in: [
            WorkEventType.NIGHT_DUTY_RECORDED,
            WorkEventType.TRAVEL_RECORDED,
            WorkEventType.LEAVE_RECORDED,
          ],
        },
      },
      orderBy: { occurredAt: "asc" },
    });

    const ndaRows: NdaRow[] = [];
    const taRows: TaRow[] = [];
    const leaveRows: LeaveRow[] = [];
    for (const e of events) {
      const p = e.payload as Record<string, unknown>;
      if (e.eventType === WorkEventType.NIGHT_DUTY_RECORDED) {
        ndaRows.push({
          date: e.occurredAt,
          duty:
            p.startTime && p.endTime ? `${p.startTime}–${p.endTime}` : "22:00–06:00",
          nightHours: round2(((p.nightMinutes as number | undefined) ?? 480) / 60),
          weightageHours: round2((p.weightageHours as number | undefined) ?? 0),
          hourlyRate: (p.hourlyRate as number | undefined) ?? 0,
          daPercent: (p.daPercent as number | undefined) ?? null,
          amount: (p.amount as number | undefined) ?? 0,
          remarks: e.remarks,
        });
      } else if (e.eventType === WorkEventType.TRAVEL_RECORDED) {
        const dep = p.departureTime as string | null | undefined;
        const ret = p.returnTime as string | null | undefined;
        taRows.push({
          date: e.occurredAt,
          route: [p.from, p.to].filter(Boolean).join(" → "),
          purpose: (p.purpose as string | undefined) ?? "",
          away: awayLabel(e.occurredAt, p.returnDate as string | undefined, dep, ret),
          claimPercent: (p.claimPercent as number | undefined) ?? 0,
          dailyRate:
            (p.dailyRate as number | undefined) ?? (p.taBaseAmount as number | undefined) ?? 0,
          amount: (p.amount as number | undefined) ?? 0,
          remarks: e.remarks,
        });
      } else {
        leaveRows.push({
          type: p.usesCr
            ? "CR"
            : (LEAVE_TYPE_SHORT_LABELS[p.leaveType as LeaveType] ?? String(p.leaveType)),
          startDate: new Date((p.startDate as string | undefined) ?? e.occurredAt),
          endDate: new Date((p.endDate as string | undefined) ?? e.occurredAt),
          days: (p.days as number | undefined) ?? 0,
          reason: e.remarks,
        });
      }
    }

    const [ndaSettlement, taSettlement, cr, balances, crBalance] = await Promise.all([
      settlementInfo(userId, "NIGHT_DUTY", m),
      settlementInfo(userId, "TRAVEL", m),
      this.getCrRegister(userId, start, end),
      ledgerService.getBalances(userId),
      ledgerService.getCrBalance(userId),
    ]);

    return {
      month: m,
      nda: {
        rows: ndaRows,
        total: round2(ndaRows.reduce((s, r) => s + r.amount, 0)),
        settlement: ndaSettlement,
      },
      ta: {
        rows: taRows,
        total: round2(taRows.reduce((s, r) => s + r.amount, 0)),
        settlement: taSettlement,
      },
      cr,
      leave: leaveRows,
      balances: {
        cr: crBalance,
        cl: balances[LedgerAccount.LEAVE_CL] ?? 0,
        lap: balances[LedgerAccount.LEAVE_LAP] ?? 0,
        lhap: balances[LedgerAccount.LEAVE_LHAP] ?? 0,
      },
    };
  },

  /** CR credits earned in the period, with how much has been used. */
  async getCrRegister(userId: string, start: Date, end: Date): Promise<CrRow[]> {
    const credits = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: WorkEventType.CR_CREDIT_ISSUED,
        voidedAt: null,
        occurredAt: { gte: start, lte: end },
      },
      include: { ledgerEntries: true },
      orderBy: { occurredAt: "asc" },
    });
    // One query for every credit's ledger entries, instead of one per credit.
    const entries = credits.length
      ? await prisma.ledgerEntry.findMany({
          where: {
            userId,
            account: LedgerAccount.CR_CREDIT,
            subAccountKey: { in: credits.map((c) => c.id) },
          },
          select: { subAccountKey: true, amount: true },
        })
      : [];
    const balanceByCredit = new Map<string, number>();
    for (const e of entries) {
      if (!e.subAccountKey) continue;
      balanceByCredit.set(
        e.subAccountKey,
        (balanceByCredit.get(e.subAccountKey) ?? 0) + Number(e.amount),
      );
    }

    const now = new Date();
    const rows: CrRow[] = [];
    for (const c of credits) {
      const earnedEntry = c.ledgerEntries[0];
      const earned = Number(earnedEntry?.amount ?? 0);
      const balance = round2(balanceByCredit.get(c.id) ?? 0);
      const used = round2(earned - balance);
      const expiresAt = earnedEntry?.expiresAt ?? null;
      const expired = expiresAt != null && expiresAt <= now;
      rows.push({
        workDate: c.occurredAt,
        dayLabel: (c.payload as { dayLabel?: string }).dayLabel ?? "",
        earned,
        expiresAt,
        used,
        balance: expired ? 0 : balance,
        status:
          balance <= 0
            ? "Used"
            : expired
              ? "Expired"
              : used > 0
                ? "Partly used"
                : "Available",
      });
    }
    return rows;
  },

  /** NDA + TA money for one month, without building the whole statement. */
  async getMonthClaimTotal(userId: string, m: ReportMonth): Promise<number> {
    const { start, end } = monthRange(m);
    const claims = await prisma.workEvent.findMany({
      where: {
        userId,
        voidedAt: null,
        occurredAt: { gte: start, lte: end },
        eventType: { in: [WorkEventType.NIGHT_DUTY_RECORDED, WorkEventType.TRAVEL_RECORDED] },
      },
      select: { payload: true },
    });
    return round2(
      claims.reduce((sum, c) => sum + ((c.payload as { amount?: number }).amount ?? 0), 0),
    );
  },

  /** Claims, leave and CR for the financial year containing `m`, with a per-month money series. */
  async getFinancialYearTotals(userId: string, m: ReportMonth) {
    const fy = financialYearOf(m);
    const events = await prisma.workEvent.findMany({
      where: {
        userId,
        voidedAt: null,
        occurredAt: { gte: fy.start, lte: fy.end },
        eventType: {
          in: [
            WorkEventType.NIGHT_DUTY_RECORDED,
            WorkEventType.TRAVEL_RECORDED,
            WorkEventType.LEAVE_RECORDED,
            WorkEventType.CR_CREDIT_ISSUED,
          ],
        },
      },
      select: { eventType: true, payload: true, occurredAt: true },
    });

    const claimEntries: { occurredAt: Date; amount: number }[] = [];
    let nda = 0;
    let ta = 0;
    let nights = 0;
    let journeys = 0;
    let leaveDays = 0;
    let crEarned = 0;
    for (const e of events) {
      const p = e.payload as { amount?: number; days?: number };
      if (e.eventType === WorkEventType.LEAVE_RECORDED) {
        leaveDays += p.days ?? 0;
      } else if (e.eventType === WorkEventType.CR_CREDIT_ISSUED) {
        crEarned += p.amount ?? 1;
      } else {
        const amount = p.amount ?? 0;
        if (e.eventType === WorkEventType.NIGHT_DUTY_RECORDED) {
          nda += amount;
          nights++;
        } else {
          ta += amount;
          journeys++;
        }
        claimEntries.push({ occurredAt: e.occurredAt, amount });
      }
    }
    return {
      label: fy.label,
      nda: round2(nda),
      ta: round2(ta),
      nights,
      journeys,
      leaveDays: round2(leaveDays),
      crEarned: round2(crEarned),
      months: fyMonthSeries(fy.start.getFullYear(), claimEntries),
    };
  },
};
