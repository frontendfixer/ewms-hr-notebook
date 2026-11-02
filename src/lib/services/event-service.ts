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
import {
  calculateNda,
  calculateTaAmount,
  daPercentOn,
  NDA_MAX_PAY_LEVEL,
  parseTimeToMinutes,
  tourClaimPercent,
  tourDaySlabs,
} from "@/lib/calculations/allowances";
import {
  allocateCrCredits,
  countLeaveDays,
  HOLIDAY_EXCLUDING_LEAVE,
  leaveDayKey,
  rangesOverlap,
} from "@/lib/calculations/leave";
import { getPaySettings, requirePaySettings, taRateOn } from "@/lib/pay-settings";
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
import { leaveAccrualService } from "@/lib/services/leave-accrual-service";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";
import { isBalanceDeductingLeaveType, LEAVE_TYPE_SHORT_LABELS } from "@/lib/leave-types";
import { CLAIM_STATUS_LABELS } from "@/lib/design-tokens";

const LEAVE_ACCOUNT_MAP: Partial<Record<LeaveType, LedgerAccount>> = {
  CL: LedgerAccount.LEAVE_CL,
  LAP: LedgerAccount.LEAVE_LAP,
  LHAP: LedgerAccount.LEAVE_LHAP,
};

const STATUS_EVENT_TYPES: WorkEventType[] = [
  WorkEventType.BILL_SUBMITTED,
  WorkEventType.CLAIM_PASSED,
  WorkEventType.PAYMENT_RECEIVED,
  WorkEventType.STATUS_CHANGED,
];

export { getUserSetting } from "@/lib/user-settings";

export async function getCrExpiryDays(userId: string): Promise<number> {
  const val = await getUserSetting(
    userId,
    SETTING_KEYS.CR_EXPIRY_DAYS,
    String(DEFAULT_CR_EXPIRY_DAYS),
  );
  return parseInt(val, 10) || DEFAULT_CR_EXPIRY_DAYS;
}

async function holidayKeysBetween(
  userId: string,
  start: Date,
  end: Date,
): Promise<Map<string, string>> {
  const holidays = await prisma.publicHoliday.findMany({
    where: { userId, date: { gte: startOfDay(start), lte: startOfDay(end) } },
  });
  return new Map(holidays.map((h) => [leaveDayKey(h.date), h.name]));
}

/** Why a date earns CR: Sunday, a saved holiday, or a declared rostered rest day. */
async function crDayKind(
  userId: string,
  workDate: Date,
  restDayConfirmed: boolean,
): Promise<{ kind: "SUNDAY" | "HOLIDAY" | "REST_DAY"; label: string }> {
  const d = startOfDay(workDate);
  if (isSunday(d)) return { kind: "SUNDAY", label: "Sunday" };
  const holidays = await holidayKeysBetween(userId, d, d);
  const holiday = holidays.get(leaveDayKey(d));
  if (holiday) return { kind: "HOLIDAY", label: holiday };
  if (restDayConfirmed) return { kind: "REST_DAY", label: "Rest day" };
  throw new Error(
    `${formatDate(d)} is not a Sunday or a saved holiday. Tick "rostered rest day" if you worked on your weekly rest, or add the holiday in Settings.`,
  );
}

type LeavePayload = {
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
  duration?: string;
  usesCr?: boolean;
};

export const eventService = {
  async recordHolidayWork(userId: string, input: HolidayWorkInput) {
    const expiryDays = await getCrExpiryDays(userId);
    const workDate = startOfDay(input.workDate);
    if (workDate > startOfDay(new Date())) {
      throw new Error("CR can only be recorded after the work is done");
    }
    const day = await crDayKind(userId, workDate, input.restDayConfirmed);
    const amount = input.amount;
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
    if (existing) throw new Error(`CR already recorded for ${formatDate(workDate)}`);

    return prisma.$transaction(async (tx) => {
      const hw = await tx.workEvent.create({
        data: {
          userId,
          eventType: WorkEventType.HOLIDAY_WORK_RECORDED,
          domain: EventDomain.CR,
          occurredAt: workDate,
          title: `CR work (${day.label}) — ${formatDate(workDate)}`,
          remarks: input.remarks,
          correlationId,
          payload: {
            workDate: workDate.toISOString(),
            dayLabel: day.label,
            dayKind: day.kind,
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
          payload: { amount, expiresAt: expiresAt.toISOString(), dayLabel: day.label },
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

  /** Chargeable days for a leave request, skipping Sundays/holidays for CL and CR. */
  async previewLeaveDays(
    userId: string,
    input: Pick<LeaveRecordInput, "leaveType" | "startDate" | "endDate" | "duration" | "usesCr">,
  ) {
    const kindKey = input.usesCr ? "CR" : input.leaveType;
    const excludeHolidays = HOLIDAY_EXCLUDING_LEAVE.has(kindKey);
    const holidays = excludeHolidays
      ? await holidayKeysBetween(userId, input.startDate, input.endDate)
      : new Map<string, string>();
    return countLeaveDays(input.startDate, input.endDate, input.duration, {
      excludeHolidays,
      holidayKeys: new Set(holidays.keys()),
    });
  },

  async findOverlappingLeave(
    userId: string,
    start: Date,
    end: Date,
    duration: string,
  ) {
    const candidates = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: WorkEventType.LEAVE_RECORDED,
        voidedAt: null,
        occurredAt: { lte: end, gte: addDays(start, -400) },
      },
    });
    return candidates.find((e) => {
      const p = e.payload as LeavePayload;
      const s = startOfDay(new Date(p.startDate ?? e.occurredAt));
      const en = startOfDay(new Date(p.endDate ?? e.occurredAt));
      if (!rangesOverlap(s, en, start, end)) return false;
      // Morning and afternoon halves of the same day can both be taken.
      const otherHalf =
        duration !== "FULL" &&
        p.duration != null &&
        p.duration !== "FULL" &&
        p.duration !== duration;
      return !otherHalf;
    });
  },

  async recordLeave(userId: string, input: LeaveRecordInput) {
    if (input.usesCr && input.leaveType !== LeaveType.SPECIAL_CL) {
      throw new Error("CR can only be used with compensatory rest leave");
    }
    await leaveAccrualService.ensureAccruals(userId);

    const start = startOfDay(input.startDate);
    const end = startOfDay(input.endDate);
    const count = await this.previewLeaveDays(userId, input);
    const days = count.days;
    if (days <= 0) {
      throw new Error("All selected dates are Sundays or holidays — no leave needed");
    }

    const overlap = await this.findOverlappingLeave(userId, start, end, input.duration);
    if (overlap) {
      throw new Error(`These dates overlap an existing leave: ${overlap.title}`);
    }

    const account = !input.usesCr ? LEAVE_ACCOUNT_MAP[input.leaveType] : undefined;
    if (account && isBalanceDeductingLeaveType(input.leaveType)) {
      const balances = await ledgerService.getBalances(userId);
      const available = balances[account] ?? 0;
      if (available < days) {
        throw new Error(
          `Not enough ${LEAVE_TYPE_SHORT_LABELS[input.leaveType]}: ${available} day(s) available, ${days} needed`,
        );
      }
    }

    const correlationId = crypto.randomUUID();
    const rangeLabel = `${formatDate(start)}${end > start ? ` to ${formatDate(end)}` : ""}`;
    const halfLabel =
      input.duration === "FIRST_HALF"
        ? " (first half)"
        : input.duration === "SECOND_HALF"
          ? " (second half)"
          : "";
    const leaveTitle = input.usesCr
      ? `CR leave — ${rangeLabel}${halfLabel}`
      : `${LEAVE_TYPE_SHORT_LABELS[input.leaveType]} leave — ${rangeLabel}${halfLabel}`;

    return prisma.$transaction(async (tx) => {
      let allocations: { creditEventId: string; amount: number }[] = [];
      if (input.usesCr) {
        const credits = await ledgerService.getAvailableCrCredits(userId, tx, start);
        const result = allocateCrCredits(
          credits,
          days,
          start,
          input.crCreditEventIds ?? [],
        );
        if (result.shortfall > 0) {
          const have = days - result.shortfall;
          throw new Error(
            `Not enough CR valid on ${formatDate(start)}: ${have} day(s) available, ${days} needed`,
          );
        }
        allocations = result.allocations;
      }

      const leave = await tx.workEvent.create({
        data: {
          userId,
          eventType: WorkEventType.LEAVE_RECORDED,
          domain: EventDomain.LEAVE,
          occurredAt: start,
          title: leaveTitle,
          remarks: input.reason,
          correlationId,
          payload: {
            leaveType: input.leaveType,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            duration: input.duration,
            days,
            calendarDays: count.calendarDays,
            excludedDays: count.excludedDays,
            usesCr: input.usesCr,
          },
        },
      });

      if (account) {
        await tx.ledgerEntry.create({
          data: {
            userId,
            eventId: leave.id,
            account,
            amount: -days,
            occurredAt: start,
            metadata: { leaveType: input.leaveType },
          },
        });
      }

      for (const { creditEventId, amount } of allocations) {
        await tx.workEvent.create({
          data: {
            userId,
            eventType: WorkEventType.CR_CONSUMED,
            domain: EventDomain.CR,
            occurredAt: start,
            title: `${amount} CR used for leave on ${formatDate(start)}`,
            correlationId,
            parentEventId: leave.id,
            payload: { crCreditEventId: creditEventId, leaveEventId: leave.id, amount },
          },
        });

        await tx.ledgerEntry.create({
          data: {
            userId,
            eventId: leave.id,
            account: LedgerAccount.CR_CREDIT,
            subAccountKey: creditEventId,
            amount: -amount,
            occurredAt: start,
          },
        });
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
    if (pay.payLevel != null && pay.payLevel > NDA_MAX_PAY_LEVEL + 1) {
      throw new Error(
        `NDA is admissible up to Pay Level ${NDA_MAX_PAY_LEVEL} (Level 8 only through MACP). Your profile says Level ${pay.payLevel}.`,
      );
    }
    const endDate = input.endDate ?? input.startDate;
    const dates = eachDayInclusive(input.startDate, endDate);
    if (dates.length === 0) throw new Error("Select at least one date");

    const probe = calculateNda(pay.basicPay, 0, input.startTime, input.endTime);
    if (probe.nightMinutes === 0) {
      throw new Error(
        `No part of ${input.startTime}–${input.endTime} falls between 22:00 and 06:00, so no NDA is due`,
      );
    }

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
        const daPercent = daPercentOn(dutyDate, pay.daPercentOverride);
        const nda = calculateNda(pay.basicPay, daPercent, input.startTime, input.endTime);
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
              startTime: input.startTime,
              endTime: input.endTime,
              nightMinutes: nda.nightMinutes,
              weightageHours: nda.weightageHours,
              hourlyRate: nda.hourlyRate,
              ndaBasicPay: nda.ndaBasicPay,
              amount: nda.amount,
              basicPay: pay.basicPay,
              payLevel: pay.payLevel,
              daPercent,
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
    const pay = await getPaySettings(userId);
    if (pay.payLevel == null && pay.taRateOverride == null) {
      throw new Error(
        "Set your Pay Level in Settings so the daily allowance rate can be worked out",
      );
    }
    const journeyDate = startOfDay(input.journeyDate);
    const returnDate = startOfDay(input.returnDate ?? input.journeyDate);

    let computedPercent: number | null = null;
    let slabs: ReturnType<typeof tourDaySlabs> = [];
    const depMinutes = parseTimeToMinutes(input.departureTime);
    const retMinutes = parseTimeToMinutes(input.returnTime);
    if (depMinutes != null && retMinutes != null) {
      const departure = new Date(journeyDate.getTime() + depMinutes * 60_000);
      const arrival = new Date(returnDate.getTime() + retMinutes * 60_000);
      if (!(arrival > departure)) {
        throw new Error("Return must be after departure");
      }
      slabs = tourDaySlabs(departure, arrival);
      computedPercent = input.beyond8Km ? tourClaimPercent(departure, arrival) : 0;
    }

    const claimPercent = input.claimPercent ?? computedPercent;
    if (claimPercent == null) {
      throw new Error("Enter departure and return times, or a claim %");
    }

    const duplicate = await prisma.workEvent.findFirst({
      where: {
        userId,
        eventType: WorkEventType.TRAVEL_RECORDED,
        voidedAt: null,
        occurredAt: journeyDate,
      },
    });
    if (duplicate) {
      const p = duplicate.payload as { to?: string; departureTime?: string };
      if (
        p.to?.trim().toLowerCase() === input.to.trim().toLowerCase() &&
        (p.departureTime ?? null) === (input.departureTime ?? null)
      ) {
        throw new Error(
          `A journey to ${input.to} on ${formatDate(journeyDate)} is already recorded`,
        );
      }
    }

    const dailyRate = taRateOn(pay, journeyDate);
    const amount = calculateTaAmount(dailyRate, claimPercent);

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
            returnDate: returnDate.toISOString(),
            departureTime: input.departureTime ?? null,
            returnTime: input.returnTime ?? null,
            from: input.from,
            to: input.to,
            purpose: input.purpose,
            beyond8Km: input.beyond8Km,
            slabs,
            computedPercent,
            claimPercent,
            amount,
            dailyRate,
            // Kept for entries displayed by older code paths.
            taBaseAmount: dailyRate,
            payLevel: pay.payLevel,
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

    const summary = await monthlyClaimService.getSettlementSummary(claim.id);
    const current = summary.status;
    const next = claimStatusService.getNextStatus(current);
    if (next !== input.toStatus) {
      throw new Error(
        `Can't move from "${CLAIM_STATUS_LABELS[current]}" to "${CLAIM_STATUS_LABELS[input.toStatus]}"`,
      );
    }

    const eventTypeMap: Partial<Record<ClaimStatus, WorkEventType>> = {
      BILL_SUBMITTED: WorkEventType.BILL_SUBMITTED,
      PASSED: WorkEventType.CLAIM_PASSED,
      PAID: WorkEventType.PAYMENT_RECEIVED,
    };

    const eventType =
      eventTypeMap[input.toStatus] ?? WorkEventType.STATUS_CHANGED;
    const amount =
      input.toStatus === ClaimStatus.PAID
        ? (input.amount ?? summary.outstanding)
        : input.amount;
    const paymentDate =
      input.toStatus === ClaimStatus.PAID
        ? (input.paymentDate ?? new Date())
        : input.paymentDate;

    return prisma.$transaction(async (tx) => {
      const statusEvent = await tx.workEvent.create({
        data: {
          userId,
          eventType,
          domain: EventDomain.META,
          occurredAt: paymentDate ?? new Date(),
          title: `Status → ${input.toStatus}`,
          parentEventId: claim.id,
          remarks: input.remarks,
          payload: {
            from: current,
            to: input.toStatus,
            claimEventId: claim.id,
            billNumber: input.billNumber,
            amount,
            claimedTotal: summary.total,
            paymentDate: paymentDate?.toISOString(),
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
            ...(paymentDate
              ? { paymentDate: paymentDate.toISOString() }
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

  /** Undo the latest status step on a monthly settlement. */
  async revertClaimStatus(userId: string, settlementId: string) {
    const settlement = await prisma.workEvent.findFirst({
      where: {
        id: settlementId,
        userId,
        eventType: WorkEventType.MONTHLY_CLAIM_SETTLEMENT,
        voidedAt: null,
      },
    });
    if (!settlement) throw new Error("Claim not found");

    const last = await prisma.workEvent.findFirst({
      where: {
        parentEventId: settlementId,
        userId,
        voidedAt: null,
        eventType: { in: STATUS_EVENT_TYPES },
      },
      orderBy: { recordedAt: "desc" },
    });
    if (!last) throw new Error("Nothing to undo");
    const previous = (last.payload as { from?: ClaimStatus }).from ?? ClaimStatus.DRAFT;

    return prisma.$transaction(async (tx) => {
      const voidEv = await tx.workEvent.create({
        data: {
          userId,
          eventType: WorkEventType.EVENT_VOIDED,
          domain: EventDomain.META,
          occurredAt: new Date(),
          title: `Undone: ${last.title}`,
          parentEventId: last.id,
          payload: { voidedEventId: last.id },
        },
      });
      await tx.workEvent.update({
        where: { id: last.id },
        data: { voidedAt: new Date(), voidingEventId: voidEv.id },
      });
      const existingPayload = settlement.payload as Prisma.JsonObject;
      await tx.workEvent.update({
        where: { id: settlementId },
        data: { payload: { ...existingPayload, currentStatus: previous } },
      });
      return previous;
    }, INTERACTIVE_TX_OPTIONS);
  },

  async voidEvent(userId: string, eventId: string, reason?: string) {
    const root = await prisma.workEvent.findFirst({
      where: { id: eventId, userId, voidedAt: null },
    });
    if (!root) throw new Error("Event not found");

    if (root.eventType === WorkEventType.MONTHLY_CLAIM_SETTLEMENT) {
      throw new Error("Delete the individual entries instead of the whole month");
    }
    if (STATUS_EVENT_TYPES.includes(root.eventType)) {
      throw new Error("Use “Undo last step” on the claim to reverse a status change");
    }

    let targetId = eventId;
    if (
      root.eventType === WorkEventType.CR_CREDIT_ISSUED &&
      root.parentEventId
    ) {
      targetId = root.parentEventId;
    }

    // A CR credit already used for leave can't disappear under that leave.
    const creditIds =
      root.eventType === WorkEventType.CR_CREDIT_ISSUED
        ? [root.id]
        : root.eventType === WorkEventType.HOLIDAY_WORK_RECORDED
          ? (
              await prisma.workEvent.findMany({
                where: { parentEventId: root.id, voidedAt: null },
                select: { id: true },
              })
            ).map((c) => c.id)
          : [];
    if (creditIds.length > 0) {
      const used = await prisma.workEvent.findMany({
        where: { userId, eventType: WorkEventType.CR_CONSUMED, voidedAt: null },
        include: { parentEvent: true },
      });
      const usage = used.find((u) =>
        creditIds.includes((u.payload as { crCreditEventId?: string }).crCreditEventId ?? ""),
      );
      if (usage) {
        throw new Error(
          `This CR is used by “${usage.parentEvent?.title ?? "a leave"}”. Delete that leave first.`,
        );
      }
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
              occurredAt: entry.occurredAt,
              expiresAt: entry.expiresAt,
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

  async getCrLeaveAppliedDate(
    userId: string,
    crCreditEventId: string,
  ): Promise<Date | null> {
    const consumedEvents = await prisma.workEvent.findMany({
      where: {
        userId,
        eventType: WorkEventType.CR_CONSUMED,
        voidedAt: null,
      },
      include: { parentEvent: true },
    });

    const match = consumedEvents.find((event) => {
      const payload = event.payload as { crCreditEventId?: string };
      return payload.crCreditEventId === crCreditEventId;
    });

    if (!match?.parentEvent || match.parentEvent.voidedAt) return null;

    const leavePayload = match.parentEvent.payload as {
      startDate?: string;
    };
    if (leavePayload.startDate) return new Date(leavePayload.startDate);
    return match.parentEvent.occurredAt;
  },
};
