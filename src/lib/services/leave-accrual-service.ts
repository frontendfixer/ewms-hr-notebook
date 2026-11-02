import {
  EventDomain,
  LedgerAccount,
  WorkEventType,
} from "@/generated/prisma/client";
import { INTERACTIVE_TX_OPTIONS, prisma } from "@/lib/db";
import {
  dueAccrualPeriods,
  LAP_HALF_YEARLY_CREDIT,
  LAP_MAX_ACCUMULATION,
  LHAP_HALF_YEARLY_CREDIT,
  type AccrualPeriod,
} from "@/lib/calculations/leave";
import { getPaySettings } from "@/lib/pay-settings";

function accrualCorrelationId(period: AccrualPeriod): string {
  return `leave-accrual:${period.kind}:${period.periodKey}`;
}

const ACCOUNT_BY_KIND = {
  CL_YEAR: LedgerAccount.LEAVE_CL,
  LAP_HALF: LedgerAccount.LEAVE_LAP,
  LHAP_HALF: LedgerAccount.LEAVE_LHAP,
} as const;

async function balanceBefore(
  userId: string,
  account: LedgerAccount,
  date: Date,
): Promise<number> {
  const sum = await prisma.ledgerEntry.aggregate({
    where: { userId, account, occurredAt: { lt: date } },
    _sum: { amount: true },
  });
  return Number(sum._sum.amount ?? 0);
}

export const leaveAccrualService = {
  /**
   * Apply any due CL resets and LAP/LHAP half-yearly credits. Accrual starts
   * after the latest balance the user set by hand (onboarding or "Update leave
   * balances"), because those balances already include earlier credits.
   */
  async ensureAccruals(userId: string, asOf: Date = new Date()) {
    const pay = await getPaySettings(userId);
    if (!pay.autoLeaveCredits) return 0;

    const manualSets = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: WorkEventType.LEAVE_LEDGER_ADJUSTMENT,
        voidedAt: null,
      },
      select: { occurredAt: true, payload: true },
    });
    const baselines = manualSets
      .filter((e) => {
        const type = (e.payload as { type?: string }).type;
        return type === "onboarding" || type === "manual";
      })
      .map((e) => e.occurredAt.getTime());
    if (baselines.length === 0) return 0;
    const since = new Date(Math.max(...baselines));

    const periods = dueAccrualPeriods(since, asOf);
    if (periods.length === 0) return 0;

    const existing = await prisma.workEvent.findMany({
      where: {
        userId,
        correlationId: { in: periods.map(accrualCorrelationId) },
      },
      select: { correlationId: true },
    });
    const done = new Set(existing.map((e) => e.correlationId));

    let applied = 0;
    for (const period of periods) {
      const correlationId = accrualCorrelationId(period);
      if (done.has(correlationId)) continue;

      const account = ACCOUNT_BY_KIND[period.kind];
      const before = await balanceBefore(userId, account, period.date);
      let delta: number;
      let title: string;
      let lapsed = 0;
      if (period.kind === "CL_YEAR") {
        delta = pay.clEntitlement - before;
        lapsed = Math.max(0, before);
        title = `CL for ${period.periodKey}: ${pay.clEntitlement} days`;
      } else if (period.kind === "LAP_HALF") {
        lapsed = Math.max(0, before - LAP_MAX_ACCUMULATION);
        delta = LAP_HALF_YEARLY_CREDIT - lapsed;
        title = `LAP credit +${LAP_HALF_YEARLY_CREDIT} (${period.periodKey})`;
      } else {
        delta = LHAP_HALF_YEARLY_CREDIT;
        title = `LHAP credit +${LHAP_HALF_YEARLY_CREDIT} (${period.periodKey})`;
      }

      await prisma.$transaction(async (tx) => {
        const event = await tx.workEvent.create({
          data: {
            userId,
            eventType: WorkEventType.LEAVE_LEDGER_ADJUSTMENT,
            domain: EventDomain.LEAVE,
            occurredAt: period.date,
            title,
            correlationId,
            payload: {
              type: "accrual",
              kind: period.kind,
              periodKey: period.periodKey,
              balanceBefore: before,
              lapsed,
            },
          },
        });
        if (delta !== 0) {
          await tx.ledgerEntry.create({
            data: {
              userId,
              eventId: event.id,
              account,
              amount: delta,
              occurredAt: period.date,
              metadata: { accrual: period.kind, periodKey: period.periodKey },
            },
          });
        }
      }, INTERACTIVE_TX_OPTIONS);
      applied++;
    }
    return applied;
  },
};
