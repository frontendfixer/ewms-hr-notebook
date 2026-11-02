"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { requireUserId, ensureProfile } from "@/lib/auth-server";
import { eventService } from "@/lib/services/event-service";
import { INTERACTIVE_TX_OPTIONS, prisma } from "@/lib/db";
import { LedgerAccount, WorkEventType, EventDomain } from "@/generated/prisma/client";
import { SETTING_KEYS, DEFAULT_CR_EXPIRY_DAYS } from "@/lib/design-tokens";
import {
  holidayWorkSchema,
  leaveRecordSchema,
  leaveBalanceAdjustSchema,
  nightDutySchema,
  travelSchema,
  statusTransitionSchema,
  profileSchema,
  onboardingBalancesSchema,
  holidaySchema,
  paySettingsSchema,
} from "@/lib/validations/schemas";
import { upsertUserSettings } from "@/lib/pay-settings";

/**
 * Server actions return expected failures as values: Next.js replaces thrown
 * error messages with a generic one in production builds.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const FIELD_LABELS: Record<string, string> = {
  workDate: "the work date",
  startDate: "the start date",
  endDate: "the end date",
  journeyDate: "the journey date",
  returnDate: "the return date",
  basicPay: "your basic pay",
  payLevel: "your pay level",
  to: "the destination",
  date: "the date",
  name: "a name",
};

function friendlyError(error: unknown): string {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = String(issue?.path[0] ?? "");
    if (issue?.code === "invalid_type" && FIELD_LABELS[field]) {
      return `Please enter ${FIELD_LABELS[field]}`;
    }
    return issue?.message ?? "Please check the form";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    unstable_rethrow(error);
    // Database/driver errors are not meant for users; log them and stay generic.
    if (
      !(error instanceof Error) ||
      error.constructor.name.startsWith("PrismaClient")
    ) {
      console.error(error);
      return { ok: false, error: "Couldn't save right now — please try again" };
    }
    return { ok: false, error: friendlyError(error) };
  }
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

const nullableString = (v: FormDataEntryValue | null) =>
  v == null || v === "" ? undefined : v;

export async function recordHolidayWork(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    const parsed = holidayWorkSchema.parse({
      workDate: formData.get("workDate"),
      restDayConfirmed: formData.get("restDayConfirmed") === "on",
      amount: formData.get("amount") ?? 1,
      remarks: nullableString(formData.get("remarks")),
    });
    await eventService.recordHolidayWork(userId, parsed);
    revalidateAll();
  });
}

export async function recordLeave(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    const crIds = formData.getAll("crCreditEventIds") as string[];
    const parsed = leaveRecordSchema.parse({
      leaveType: formData.get("leaveType"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate") || formData.get("startDate"),
      duration: formData.get("duration") || "FULL",
      reason: nullableString(formData.get("reason")),
      usesCr: formData.get("usesCr") === "true",
      crCreditEventIds: crIds.length ? crIds : undefined,
    });
    const leave = await eventService.recordLeave(userId, parsed);
    revalidateAll();
    return { days: (leave.payload as { days?: number }).days ?? 0 };
  });
}

export async function adjustLeaveBalances(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    const parsed = leaveBalanceAdjustSchema.parse({
      clBalance: formData.get("clBalance"),
      lapBalance: formData.get("lapBalance"),
      lhapBalance: formData.get("lhapBalance"),
      reason: nullableString(formData.get("reason")),
    });
    await eventService.adjustLeaveBalances(userId, parsed);
    revalidateAll();
  });
}

export async function recordNightDuty(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    const parsed = nightDutySchema.parse({
      startDate: formData.get("startDate"),
      endDate: nullableString(formData.get("endDate")),
      startTime: nullableString(formData.get("startTime")),
      endTime: nullableString(formData.get("endTime")),
      remarks: nullableString(formData.get("remarks")),
    });
    const created = await eventService.recordNightDuty(userId, parsed);
    revalidateAll();
    return { count: created.length };
  });
}

export async function recordTravel(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    const parsed = travelSchema.parse({
      journeyDate: formData.get("journeyDate"),
      departureTime: nullableString(formData.get("departureTime")),
      returnDate: nullableString(formData.get("returnDate")),
      returnTime: nullableString(formData.get("returnTime")),
      from: nullableString(formData.get("from")),
      to: formData.get("to") ?? "",
      purpose: nullableString(formData.get("purpose")),
      beyond8Km: formData.get("beyond8Km") === "on",
      claimPercent:
        formData.get("manualPercent") === "on"
          ? formData.get("claimPercent")
          : undefined,
      remarks: nullableString(formData.get("remarks")),
    });
    await eventService.recordTravel(userId, parsed);
    revalidateAll();
  });
}

export async function transitionClaimStatus(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    const parsed = statusTransitionSchema.parse({
      claimEventId: formData.get("claimEventId"),
      toStatus: formData.get("toStatus"),
      billNumber: nullableString(formData.get("billNumber")),
      amount: nullableString(formData.get("amount")),
      paymentDate: nullableString(formData.get("paymentDate")),
      paymentReference: nullableString(formData.get("paymentReference")),
      remarks: nullableString(formData.get("remarks")),
    });
    await eventService.transitionClaimStatus(userId, parsed);
    revalidateAll();
  });
}

export async function revertClaimStatus(settlementId: string) {
  return run(async () => {
    const userId = await requireUserId();
    const status = await eventService.revertClaimStatus(userId, settlementId);
    revalidateAll();
    return { status };
  });
}

export async function voidEvent(eventId: string, reason?: string) {
  return run(async () => {
    const userId = await requireUserId();
    await eventService.voidEvent(userId, eventId, reason);
    revalidateAll();
  });
}

async function saveProfile(userId: string, formData: FormData) {
  const parsed = profileSchema.parse({
    name: formData.get("name"),
    personnelNo: formData.get("personnelNo")?.toString() ?? "",
    designation: formData.get("designation")?.toString() ?? "",
    department: formData.get("department")?.toString() ?? "",
    joinDate: nullableString(formData.get("joinDate")),
    payLevel: nullableString(formData.get("payLevel")),
    basicPay: nullableString(formData.get("basicPay")),
  });

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.name },
  });

  const profileData = {
    personnelNo: parsed.personnelNo || null,
    designation: parsed.designation || null,
    department: parsed.department || null,
    joinDate: parsed.joinDate ?? null,
  };
  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  });

  const pay: Record<string, string> = {};
  if (parsed.payLevel != null) pay[SETTING_KEYS.PAY_LEVEL] = String(parsed.payLevel);
  if (parsed.basicPay != null) pay[SETTING_KEYS.BASIC_PAY] = String(parsed.basicPay);
  if (Object.keys(pay).length > 0) await upsertUserSettings(userId, pay);
}

export async function updateProfile(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    await saveProfile(userId, formData);
    revalidateAll();
  });
}

export async function completeOnboarding(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    const balances = onboardingBalancesSchema.parse({
      clBalance: formData.get("clBalance"),
      lapBalance: formData.get("lapBalance"),
      lhapBalance: formData.get("lhapBalance"),
    });

    const profile = await ensureProfile(userId);
    if (profile.onboardingDone) return;
    await saveProfile(userId, formData);

    await prisma.$transaction(async (tx) => {
      await tx.userProfile.update({
        where: { userId },
        data: { onboardingDone: true },
      });

      await tx.userSetting.upsert({
        where: { userId_key: { userId, key: SETTING_KEYS.CR_EXPIRY_DAYS } },
        create: {
          userId,
          key: SETTING_KEYS.CR_EXPIRY_DAYS,
          value: String(DEFAULT_CR_EXPIRY_DAYS),
        },
        update: {},
      });

      const setupEvent = await tx.workEvent.create({
        data: {
          userId,
          eventType: WorkEventType.LEAVE_LEDGER_ADJUSTMENT,
          domain: EventDomain.LEAVE,
          occurredAt: new Date(),
          title: "Opening leave balances",
          payload: { type: "onboarding" },
        },
      });

      await tx.ledgerEntry.createMany({
        data: [
          {
            userId,
            eventId: setupEvent.id,
            account: LedgerAccount.LEAVE_CL,
            amount: balances.clBalance,
            occurredAt: new Date(),
          },
          {
            userId,
            eventId: setupEvent.id,
            account: LedgerAccount.LEAVE_LAP,
            amount: balances.lapBalance,
            occurredAt: new Date(),
          },
          {
            userId,
            eventId: setupEvent.id,
            account: LedgerAccount.LEAVE_LHAP,
            amount: balances.lhapBalance,
            occurredAt: new Date(),
          },
        ],
      });
    }, INTERACTIVE_TX_OPTIONS);

    revalidateAll();
  });
}

export async function addHoliday(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    const parsed = holidaySchema.parse({
      date: formData.get("date"),
      name: formData.get("name"),
    });
    // Date-only values arrive as UTC midnight; store them unchanged.
    const date = parsed.date;
    await prisma.publicHoliday.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, name: parsed.name },
      update: { name: parsed.name },
    });
    revalidateAll();
  });
}

export async function deleteHoliday(holidayId: string) {
  return run(async () => {
    const userId = await requireUserId();
    await prisma.publicHoliday.deleteMany({ where: { id: holidayId, userId } });
    revalidateAll();
  });
}

/** The three national holidays fall on fixed dates every year. */
export async function addNationalHolidays(year: number) {
  return run(async () => {
    const userId = await requireUserId();
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error("Choose a valid year");
    }
    const holidays = [
      { date: new Date(Date.UTC(year, 0, 26)), name: "Republic Day" },
      { date: new Date(Date.UTC(year, 7, 15)), name: "Independence Day" },
      { date: new Date(Date.UTC(year, 9, 2)), name: "Gandhi Jayanti" },
    ];
    for (const { date, name: holidayName } of holidays) {
      await prisma.publicHoliday.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date, name: holidayName },
        update: {},
      });
    }
    revalidateAll();
  });
}

export async function updatePaySettings(formData: FormData) {
  return run(async () => {
    const userId = await requireUserId();
    const parsed = paySettingsSchema.parse({
      basicPay: formData.get("basicPay"),
      payLevel: formData.get("payLevel"),
      daPercentOverride: formData.get("daPercentOverride"),
      taRateOverride: formData.get("taRateOverride"),
      crExpiryDays: formData.get("crExpiryDays"),
      clEntitlement: formData.get("clEntitlement"),
      autoLeaveCredits: formData.get("autoLeaveCredits") === "on",
    });

    await upsertUserSettings(userId, {
      [SETTING_KEYS.BASIC_PAY]: String(parsed.basicPay),
      [SETTING_KEYS.PAY_LEVEL]: String(parsed.payLevel),
      [SETTING_KEYS.DA_PERCENT_OVERRIDE]: parsed.daPercentOverride?.toString() ?? "",
      [SETTING_KEYS.TA_RATE_OVERRIDE]: parsed.taRateOverride?.toString() ?? "",
      [SETTING_KEYS.CR_EXPIRY_DAYS]: String(parsed.crExpiryDays ?? DEFAULT_CR_EXPIRY_DAYS),
      [SETTING_KEYS.CL_ENTITLEMENT]: parsed.clEntitlement?.toString() ?? "",
      [SETTING_KEYS.AUTO_LEAVE_CREDITS]: parsed.autoLeaveCredits ? "true" : "false",
    });
    revalidateAll();
  });
}
