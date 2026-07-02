import {
  ClaimStatus,
  EventDomain,
  LedgerAccount,
  LeaveType,
  Prisma,
  WorkEventType,
} from "@/generated/prisma/client";
import { INTERACTIVE_TX_OPTIONS, prisma } from "@/lib/db";
import { DEFAULT_CR_EXPIRY_DAYS, SETTING_KEYS } from "@/lib/design-tokens";
import { addDays, eachDayInclusive, formatDate, isSunday, startOfDay } from "@/lib/utils";
import { calculateNdaPerNight, calculateTaAmount } from "@/lib/calculations/allowances";
import { getTaBaseAmount, requirePaySettings } from "@/lib/pay-settings";
import { getUserSetting } from "@/lib/user-settings";
import type {
  HolidayWorkInput,
  LeaveBalanceAdjustInput,
  LeaveRecordInput,
  NightDutyInput,
  StatusTransitionInput,
  TravelInput,
} from "@/lib/validations/schemas";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { ledgerService } from "@/lib/services/ledger-service";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";
import { isBalanceDeductingLeaveType } from "@/lib/leave-types";

const LEAVE_ACCOUNT_MAP: Partial<Record<LeaveType, LedgerAccount>> = {
  CL: LedgerAccount.LEAVE_CL,
  LAP: LedgerAccount.LEAVE_LAP,
  LHAP: LedgerAccount.LEAVE_LHAP,
};

export { getUserSetting } from "@/lib/user-settings";

export async function getCrExpiryDays(userId: string): Promise<number> {
  const val = await getUserSetting(
    userId,
    SETTING_KEYS.CR_EXPIRY_DAYS,
    String(DEFAULT_CR_EXPIRY_DAYS),
  );
  return parseInt(val, 10) || DEFAULT_CR_EXPIRY_DAYS;
}

async function workDayLabel(
  userId: string,
  workDate: Date,
): Promise<string> {
  const d = startOfDay(workDate);
  if (isSunday(d)) return "Sunday";
  const holiday = await prisma.publicHoliday.findFirst({
    where: { userId, date: d },
  });
  if (holiday) return holiday.name;
  return "work day";
}

function leaveDays(
  start: Date,
  end: Date,
  duration: "FULL" | "FIRST_HALF" | "SECOND_HALF",
): number {
  const diff =
    Math.floor(
      (startOfDay(end).getTime() - startOfDay(start).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;
  if (duration !== "FULL") return diff * 0.5;
  return diff;
}

export const eventService = {
  async recordHolidayWork(userId: string, input: HolidayWorkInput) {
    const expiryDays = await getCrExpiryDays(userId);
    const workDate = startOfDay(input.workDate);
    const dayLabel = await workDayLabel(userId, workDate);
    const amount = 1;
    const correlationId = crypto.randomUUID();
    const expiresAt = addDays(workDate, expiryDays);

    const existing = await prisma.workEvent.findFirst({
      where: {
        userId,
        eventType: WorkEventType.HOLIDAY_WORK_RECORDED,
        occurredAt: workDate,
        voidedAt: null,
      },
    });
    if (existing) throw new Error("CR already recorded for this date");

    return prisma.$transaction(async (tx) => {
      const hw = await tx.workEvent.create({
        data: {
          userId,
          eventType: WorkEventType.HOLIDAY_WORK_RECORDED,
          domain: EventDomain.CR,
          occurredAt: workDate,
          title: `CR work (${dayLabel}) — ${formatDate(workDate)}`,
          remarks: input.remarks,
          correlationId,
          payload: {
            workDate: workDate.toISOString(),
            dayLabel,
          },
        },
      });

      const cr = await tx.workEvent.create({
        data: {
          userId,
          eventType: WorkEventType.CR_CREDIT_ISSUED,
          domain: EventDomain.CR,
          occurredAt: workDate,
          title: `+${amount} CR earned (expires ${formatDate(expiresAt)})`,
          correlationId,
          parentEventId: hw.id,
          payload: { amount, expiresAt: expiresAt.toISOString() },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          userId,
          eventId: cr.id,
          account: LedgerAccount.CR_CREDIT,
          subAccountKey: cr.id,
          amount,
          occurredAt: workDate,
          expiresAt,
          metadata: { workEventId: hw.id },
        },
      });

      return { hw, cr };
    }, INTERACTIVE_TX_OPTIONS);
  },

  async recordLeave(userId: string, input: LeaveRecordInput) {
    const days = leaveDays(input.startDate, input.endDate, input.duration);
    const correlationId = crypto.randomUUID();

    if (input.usesCr && input.leaveType !== LeaveType.SPECIAL_CL) {
      throw new Error("CR can only be used with compensatory rest leave");
    }

    if (input.usesCr) {
      const crBalance = await ledgerService.getCrBalance(userId);
      if (crBalance <= 0) {
        throw new Error("No CR credits available");
      }
    }

    const crIds = input.crCreditEventIds ?? [];
    if (input.usesCr && crIds.length === 0) {
      const available = await ledgerService.getAvailableCrCredits(userId);
      if (available.length > 0) crIds.push(available[0].creditEventId);
    }

    const leaveTitle = input.usesCr
      ? `CR leave — ${formatDate(input.startDate)}${days > 1 ? ` to ${formatDate(input.endDate)}` : ""}`
      : `${input.leaveType} leave — ${formatDate(input.startDate)}${days > 1 ? ` to ${formatDate(input.endDate)}` : ""}`;

    return prisma.$transaction(async (tx) => {
      const availableCredits =
        crIds.length > 0
          ? await ledgerService.getAvailableCrCredits(userId, tx)
          : [];

      const leave = await tx.workEvent.create({
        data: {
          userId,
          eventType: WorkEventType.LEAVE_RECORDED,
          domain: EventDomain.LEAVE,
          occurredAt: startOfDay(input.startDate),
          title: leaveTitle,
          remarks: input.reason,
          correlationId,
          payload: {
            leaveType: input.leaveType,
            startDate: input.startDate.toISOString(),
            endDate: input.endDate.toISOString(),
            duration: input.duration,
            days,
            usesCr: input.usesCr,
          },
        },
      });

      if (!input.usesCr && isBalanceDeductingLeaveType(input.leaveType)) {
        const account = LEAVE_ACCOUNT_MAP[input.leaveType];
        if (account) {
          await tx.ledgerEntry.create({
            data: {
              userId,
              eventId: leave.id,
              account,
              amount: -days,
              occurredAt: startOfDay(input.startDate),
              metadata: { leaveType: input.leaveType },
            },
          });
        }
      }

      if (input.usesCr) {
        for (const crId of crIds) {
          const match = availableCredits.find((c) => c.creditEventId === crId);
          if (!match || match.balance <= 0) {
            throw new Error("Selected CR credit is not available");
          }

          await tx.workEvent.create({
            data: {
              userId,
              eventType: WorkEventType.CR_CONSUMED,
              domain: EventDomain.CR,
              occurredAt: startOfDay(input.startDate),
              title: `CR consumed for leave`,
              correlationId,
              parentEventId: leave.id,
              payload: { crCreditEventId: crId, leaveEventId: leave.id },
            },
          });

          await tx.ledgerEntry.create({
            data: {
              userId,
              eventId: leave.id,
              account: LedgerAccount.CR_CREDIT,
              subAccountKey: crId,
              amount: -1,
              occurredAt: startOfDay(input.startDate),
            },
          });
        }
      }

      return leave;
    }, INTERACTIVE_TX_OPTIONS);
  },

  async adjustLeaveBalances(userId: string, input: LeaveBalanceAdjustInput) {
    const current = await ledgerService.getBalances(userId);
    const targets = [
      {
        account: LedgerAccount.LEAVE_CL,
        current: current.LEAVE_CL ?? 0,
        target: input.clBalance,
        label: "CL",
      },
      {
        account: LedgerAccount.LEAVE_LAP,
        current: current.LEAVE_LAP ?? 0,
        target: input.lapBalance,
        label: "LAP",
      },
      {
        account: LedgerAccount.LEAVE_LHAP,
        current: current.LEAVE_LHAP ?? 0,
        target: input.lhapBalance,
        label: "LHAP",
      },
    ];

    const deltas = targets
      .map((t) => ({ ...t, delta: t.target - t.current }))
      .filter((t) => t.delta !== 0);

    if (deltas.length === 0) return null;

    return prisma.$transaction(async (tx) => {
      const adjustment = await tx.workEvent.create({
        data: {
          userId,
          eventType: WorkEventType.LEAVE_LEDGER_ADJUSTMENT,
          domain: EventDomain.LEAVE,
          occurredAt: new Date(),
          title: "Leave balance updated",
          remarks: input.reason,
          payload: {
            type: "manual",
            clBalance: input.clBalance,
            lapBalance: input.lapBalance,
            lhapBalance: input.lhapBalance,
          },
        },
      });

      for (const { account, delta, label } of deltas) {
        await tx.ledgerEntry.create({
          data: {
            userId,
            eventId: adjustment.id,
            account,
            amount: delta,
            occurredAt: new Date(),
            metadata: { leaveType: label, reason: input.reason },
          },
        });
      }

      return adjustment;
    }, INTERACTIVE_TX_OPTIONS);
  },

  async recordNightDuty(userId: string, input: NightDutyInput) {
    const pay = await requirePaySettings(userId);
    const endDate = input.endDate ?? input.startDate;
    const dates = eachDayInclusive(input.startDate, endDate);
    if (dates.length === 0) throw new Error("Select at least one date");

    const amountPerNight = calculateNdaPerNight(pay.basicPay, pay.dearnessAllowance);

    const existing = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: WorkEventType.NIGHT_DUTY_RECORDED,
        voidedAt: null,
        occurredAt: { in: dates },
      },
      select: { occurredAt: true },
    });

    if (existing.length > 0) {
      const taken = existing
        .map((e) => formatDate(e.occurredAt))
        .join(", ");
      throw new Error(`Night duty already recorded for: ${taken}`);
    }

    return prisma.$transaction(async (tx) => {
      const created = [];
      for (const dutyDate of dates) {
        const event = await tx.workEvent.create({
          data: {
            userId,
            eventType: WorkEventType.NIGHT_DUTY_RECORDED,
            domain: EventDomain.NIGHT_DUTY,
            occurredAt: dutyDate,
            title:
              dates.length > 1
                ? `Night Duty — ${formatDate(dutyDate)}`
                : "Night Duty",
            remarks: input.remarks,
            payload: {
              dutyDate: dutyDate.toISOString(),
              startDate: startOfDay(input.startDate).toISOString(),
              endDate: startOfDay(endDate).toISOString(),
              amount: amountPerNight,
              basicPay: pay.basicPay,
              daPercent: pay.daPercent,
              dearnessAllowance: pay.dearnessAllowance,
            },
          },
        });
        await monthlyClaimService.attachClaimToSettlement(userId, event.id, tx);
        created.push(event);
      }
      return created;
    }, INTERACTIVE_TX_OPTIONS);
  },

  async recordTravel(userId: string, input: TravelInput) {
    const taBaseAmount = await getTaBaseAmount(userId);
    const journeyDate = startOfDay(input.journeyDate);
    const amount = calculateTaAmount(taBaseAmount, input.claimPercent);

    return prisma.$transaction(async (tx) => {
      const event = await tx.workEvent.create({
        data: {
          userId,
          eventType: WorkEventType.TRAVEL_RECORDED,
          domain: EventDomain.TRAVEL,
          occurredAt: journeyDate,
          title: `Travel — ${input.to}`,
          remarks: input.remarks,
          payload: {
            journeyDate: journeyDate.toISOString(),
            from: input.from,
            to: input.to,
            purpose: input.purpose,
            amount,
            taBaseAmount,
            claimPercent: input.claimPercent,
          },
        },
      });
      await monthlyClaimService.attachClaimToSettlement(userId, event.id, tx);
      return event;
    }, INTERACTIVE_TX_OPTIONS);
  },

  async transitionClaimStatus(userId: string, input: StatusTransitionInput) {
    const claim = await prisma.workEvent.findFirst({
      where: { id: input.claimEventId, userId, voidedAt: null },
    });
    if (!claim) throw new Error("Claim not found");

    if (claim.eventType !== WorkEventType.MONTHLY_CLAIM_SETTLEMENT) {
      throw new Error(
        "Status transitions must be performed on monthly settlements",
      );
    }

    const current = await claimStatusService.getStatus(claim.id);
    const next = claimStatusService.getNextStatus(current);
    if (next !== input.toStatus && input.toStatus !== current) {
      // allow explicit transitions in flow
    }

    const eventTypeMap: Partial<Record<ClaimStatus, WorkEventType>> = {
      BILL_SUBMITTED: WorkEventType.BILL_SUBMITTED,
      PASSED: WorkEventType.CLAIM_PASSED,
      PAID: WorkEventType.PAYMENT_RECEIVED,
    };

    const eventType =
      eventTypeMap[input.toStatus] ?? WorkEventType.STATUS_CHANGED;

    return prisma.$transaction(async (tx) => {
      const statusEvent = await tx.workEvent.create({
        data: {
          userId,
          eventType,
          domain: EventDomain.META,
          occurredAt: input.paymentDate ?? new Date(),
          title: `Status → ${input.toStatus}`,
          parentEventId: claim.id,
          remarks: input.remarks,
          payload: {
            from: current,
            to: input.toStatus,
            claimEventId: claim.id,
            billNumber: input.billNumber,
            amount: input.amount,
            paymentDate: input.paymentDate?.toISOString(),
            paymentReference: input.paymentReference,
          },
        },
      });

      const existingPayload = claim.payload as Prisma.JsonObject;
      await tx.workEvent.update({
        where: { id: claim.id },
        data: {
          payload: {
            ...existingPayload,
            currentStatus: input.toStatus,
            ...(input.billNumber ? { billNumber: input.billNumber } : {}),
            ...(input.paymentDate
              ? { paymentDate: input.paymentDate.toISOString() }
              : {}),
            ...(input.paymentReference
              ? { paymentReference: input.paymentReference }
              : {}),
          },
        },
      });

      return statusEvent;
    }, INTERACTIVE_TX_OPTIONS);
  },

  async voidEvent(userId: string, eventId: string, reason?: string) {
    const root = await prisma.workEvent.findFirst({
      where: { id: eventId, userId, voidedAt: null },
    });
    if (!root) throw new Error("Event not found");

    let targetId = eventId;
    if (
      root.eventType === WorkEventType.CR_CREDIT_ISSUED &&
      root.parentEventId
    ) {
      targetId = root.parentEventId;
    }

    return prisma.$transaction(async (tx) => {
      const voidOne = async (targetId: string): Promise<void> => {
        const event = await tx.workEvent.findFirst({
          where: { id: targetId, userId, voidedAt: null },
          include: { ledgerEntries: true },
        });
        if (!event) return;

        const children = await tx.workEvent.findMany({
          where: { parentEventId: event.id, userId, voidedAt: null },
          select: { id: true },
        });

        for (const child of children) {
          await voidOne(child.id);
        }

        const voidEv = await tx.workEvent.create({
          data: {
            userId,
            eventType: WorkEventType.EVENT_VOIDED,
            domain: EventDomain.META,
            occurredAt: new Date(),
            title: `Deleted: ${event.title}`,
            parentEventId: event.id,
            remarks: reason,
            payload: { voidedEventId: event.id },
          },
        });

        await tx.workEvent.update({
          where: { id: event.id },
          data: { voidedAt: new Date(), voidingEventId: voidEv.id },
        });

        for (const entry of event.ledgerEntries) {
          await tx.ledgerEntry.create({
            data: {
              userId,
              eventId: voidEv.id,
              account: entry.account,
              subAccountKey: entry.subAccountKey,
              amount: Number(entry.amount) * -1,
              occurredAt: new Date(),
              metadata: { reverses: entry.id },
            },
          });
        }
      };

      await voidOne(targetId);
    }, INTERACTIVE_TX_OPTIONS);
  },

  async getEvents(
    userId: string,
    options: {
      domain?: EventDomain;
      from?: Date;
      to?: Date;
      search?: string;
      limit?: number;
      cursor?: string;
      rootOnly?: boolean;
    } = {},
  ) {
    const where: Prisma.WorkEventWhereInput = {
      userId,
      voidedAt: null,
      NOT: { eventType: WorkEventType.HOLIDAY_WORK_RECORDED },
      ...(options.domain ? { domain: options.domain } : {}),
      ...(options.from || options.to
        ? {
            occurredAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
      ...(options.search
        ? {
            OR: [
              { title: { contains: options.search } },
              { remarks: { contains: options.search } },
            ],
          }
        : {}),
      ...(options.rootOnly
        ? {
            eventType: {
              in: [
                WorkEventType.CR_CREDIT_ISSUED,
                WorkEventType.LEAVE_RECORDED,
                WorkEventType.NIGHT_DUTY_RECORDED,
                WorkEventType.TRAVEL_RECORDED,
              ],
            },
          }
        : {}),
    };

    const events = await prisma.workEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: options.limit ?? 50,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: {
        childEvents: { where: { voidedAt: null } },
        ledgerEntries: true,
      },
    });

    return events;
  },
};
