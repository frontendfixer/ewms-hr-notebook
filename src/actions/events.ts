"use server";

import { revalidatePath } from "next/cache";
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

export async function recordHolidayWork(formData: FormData) {
  const userId = await requireUserId();
  const parsed = holidayWorkSchema.parse({
    workDate: formData.get("workDate"),
    remarks: formData.get("remarks") || undefined,
  });
  await eventService.recordHolidayWork(userId, parsed);
  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/timeline");
}

export async function recordLeave(formData: FormData) {
  const userId = await requireUserId();
  const crIds = formData.getAll("crCreditEventIds") as string[];
  const parsed = leaveRecordSchema.parse({
    leaveType: formData.get("leaveType"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || formData.get("startDate"),
    duration: formData.get("duration") || "FULL",
    reason: formData.get("reason") || undefined,
    usesCr: formData.get("usesCr") === "true",
    crCreditEventIds: crIds.length ? crIds : undefined,
  });
  await eventService.recordLeave(userId, parsed);
  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/leaves");
}

export async function adjustLeaveBalances(formData: FormData) {
  const userId = await requireUserId();
  const parsed = leaveBalanceAdjustSchema.parse({
    clBalance: formData.get("clBalance"),
    lapBalance: formData.get("lapBalance"),
    lhapBalance: formData.get("lhapBalance"),
    reason: formData.get("reason") || undefined,
  });
  await eventService.adjustLeaveBalances(userId, parsed);
  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/leaves");
}

export async function recordNightDuty(formData: FormData) {
  const userId = await requireUserId();
  const endDate = formData.get("endDate");
  const parsed = nightDutySchema.parse({
    startDate: formData.get("startDate"),
    endDate: endDate ? endDate : undefined,
    remarks: formData.get("remarks") || undefined,
  });
  const created = await eventService.recordNightDuty(userId, parsed);
  revalidatePath("/");
  revalidatePath("/claims");
  return { count: created.length };
}

export async function recordTravel(formData: FormData) {
  const userId = await requireUserId();
  const parsed = travelSchema.parse({
    journeyDate: formData.get("journeyDate"),
    from: formData.get("from") || undefined,
    to: formData.get("to"),
    purpose: formData.get("purpose") || undefined,
    claimPercent: formData.get("claimPercent") || 100,
    remarks: formData.get("remarks") || undefined,
  });
  await eventService.recordTravel(userId, parsed);
  revalidatePath("/");
  revalidatePath("/claims");
}

export async function transitionClaimStatus(formData: FormData) {
  const userId = await requireUserId();
  const parsed = statusTransitionSchema.parse({
    claimEventId: formData.get("claimEventId"),
    toStatus: formData.get("toStatus"),
    billNumber: formData.get("billNumber") || undefined,
    amount: formData.get("amount") || undefined,
    paymentDate: formData.get("paymentDate") || undefined,
    paymentReference: formData.get("paymentReference") || undefined,
    remarks: formData.get("remarks") || undefined,
  });
  await eventService.transitionClaimStatus(userId, parsed);
  revalidatePath("/");
  revalidatePath("/claims");
}

export async function voidEvent(eventId: string, reason?: string) {
  const userId = await requireUserId();
  await eventService.voidEvent(userId, eventId, reason);
  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/timeline");
  revalidatePath("/claims");
  revalidatePath("/calendar");
  revalidatePath("/records", "layout");
}

export async function updateProfile(formData: FormData) {
  const userId = await requireUserId();
  const parsed = profileSchema.parse({
    name: formData.get("name"),
    personnelNo: formData.get("personnelNo")?.toString() ?? "",
    designation: formData.get("designation")?.toString() ?? "",
    department: formData.get("department")?.toString() ?? "",
    joinDate: formData.get("joinDate") || undefined,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.name },
  });

  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      personnelNo: parsed.personnelNo || null,
      designation: parsed.designation || null,
      department: parsed.department || null,
      joinDate: parsed.joinDate ?? null,
    },
    update: {
      personnelNo: parsed.personnelNo || null,
      designation: parsed.designation || null,
      department: parsed.department || null,
      joinDate: parsed.joinDate ?? null,
    },
  });

  revalidatePath("/profile");
}

export async function completeOnboarding(formData: FormData) {
  const userId = await requireUserId();
  const balances = onboardingBalancesSchema.parse({
    clBalance: formData.get("clBalance"),
    lapBalance: formData.get("lapBalance"),
    lhapBalance: formData.get("lhapBalance"),
  });

  await ensureProfile(userId);

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

  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/onboarding");
}

export async function addHoliday(formData: FormData) {
  const userId = await requireUserId();
  const parsed = holidaySchema.parse({
    date: formData.get("date"),
    name: formData.get("name"),
  });
  await prisma.publicHoliday.upsert({
    where: {
      userId_date: { userId, date: parsed.date },
    },
    create: { userId, date: parsed.date, name: parsed.name },
    update: { name: parsed.name },
  });
  revalidatePath("/settings/holidays");
}

export async function updatePaySettings(formData: FormData) {
  const userId = await requireUserId();
  const parsed = paySettingsSchema.parse({
    basicPay: formData.get("basicPay"),
    daPercent: formData.get("daPercent"),
    taBaseAmount: formData.get("taBaseAmount"),
    crExpiryDays: formData.get("crExpiryDays") || undefined,
  });

  const entries: Record<string, string> = {
    [SETTING_KEYS.BASIC_PAY]: String(parsed.basicPay),
    [SETTING_KEYS.DA_PERCENT]: String(parsed.daPercent),
    [SETTING_KEYS.TA_BASE_AMOUNT]: String(parsed.taBaseAmount),
  };
  if (parsed.crExpiryDays != null) {
    entries[SETTING_KEYS.CR_EXPIRY_DAYS] = String(parsed.crExpiryDays);
  }

  await upsertUserSettings(userId, entries);
  revalidatePath("/settings");
}
