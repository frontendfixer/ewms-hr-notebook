import { z } from "zod";
import {
  ClaimStatus,
  EventDomain,
  LeaveDuration,
  LeaveType,
  WorkEventType,
} from "@/generated/prisma/client";
import { startOfDay } from "@/lib/utils";

const timeString = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Enter time as HH:MM (24-hour)");

const optionalNumber = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().optional(),
);

export const CR_DAY_KINDS = ["SUNDAY", "HOLIDAY", "REST_DAY"] as const;

export const holidayWorkSchema = z.object({
  workDate: z.coerce.date(),
  /** Required when the date is neither a Sunday nor a saved holiday. */
  restDayConfirmed: z.boolean().default(false),
  amount: z.coerce
    .number()
    .refine((v) => v === 1 || v === 0.5, "CR can be a full day or half day"),
  remarks: z.string().optional(),
});

export const leaveRecordSchema = z
  .object({
    leaveType: z.enum(LeaveType),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    duration: z.enum(LeaveDuration).default("FULL"),
    reason: z.string().optional(),
    usesCr: z.boolean().default(false),
    crCreditEventIds: z.array(z.string()).optional(),
  })
  .refine((d) => startOfDay(d.endDate) >= startOfDay(d.startDate), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  })
  .refine(
    (d) =>
      d.duration === "FULL" ||
      startOfDay(d.endDate).getTime() === startOfDay(d.startDate).getTime(),
    {
      message: "Half-day leave can only be taken for a single date",
      path: ["duration"],
    },
  );

export const nightDutySchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    startTime: timeString.default("22:00"),
    endTime: timeString.default("06:00"),
    remarks: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.endDate || startOfDay(data.endDate) >= startOfDay(data.startDate),
    { message: "End date must be on or after start date", path: ["endDate"] },
  )
  .refine(
    (data) =>
      !data.endDate ||
      (startOfDay(data.endDate).getTime() - startOfDay(data.startDate).getTime()) /
        86_400_000 <
        62,
    { message: "Record at most 62 nights at a time", path: ["endDate"] },
  );

export const travelSchema = z
  .object({
    journeyDate: z.coerce.date(),
    departureTime: timeString.optional(),
    returnDate: z.coerce.date().optional(),
    returnTime: timeString.optional(),
    from: z.string().optional(),
    to: z.string().trim().min(1, "Destination is required"),
    purpose: z.string().optional(),
    beyond8Km: z.boolean().default(true),
    /** Used when times are not entered, or to override the computed slab. */
    claimPercent: optionalNumber.pipe(
      z.number().min(0).max(3000, "Claim % looks too high").optional(),
    ),
    remarks: z.string().optional(),
  })
  .refine(
    (d) =>
      !d.returnDate || startOfDay(d.returnDate) >= startOfDay(d.journeyDate),
    { message: "Return date must be on or after the journey date", path: ["returnDate"] },
  );

export const paySettingsSchema = z.object({
  basicPay: z.coerce.number().min(0, "Basic pay must be zero or more"),
  payLevel: z.coerce
    .number()
    .int("Pay level is a whole number")
    .min(1, "Pay level is between 1 and 18")
    .max(18, "Pay level is between 1 and 18"),
  daPercentOverride: optionalNumber.pipe(
    z.number().min(0).max(300, "DA % looks too high").optional(),
  ),
  taRateOverride: optionalNumber.pipe(z.number().min(1).optional()),
  crExpiryDays: optionalNumber.pipe(z.number().int().min(1).max(365).optional()),
  clEntitlement: optionalNumber.pipe(z.number().min(0).max(30).optional()),
  autoLeaveCredits: z.boolean().default(true),
});

export const statusTransitionSchema = z.object({
  claimEventId: z.string(),
  toStatus: z.enum(ClaimStatus),
  billNumber: z.string().optional(),
  amount: optionalNumber.pipe(z.number().min(0).optional()),
  paymentDate: z.coerce.date().optional(),
  paymentReference: z.string().optional(),
  remarks: z.string().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  personnelNo: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  joinDate: z.coerce.date().optional(),
  payLevel: optionalNumber.pipe(z.number().int().min(1).max(18).optional()),
  basicPay: optionalNumber.pipe(z.number().min(0).optional()),
});

export const onboardingBalancesSchema = z.object({
  clBalance: z.coerce.number().min(0).default(8),
  lapBalance: z.coerce.number().min(0).max(315).default(0),
  lhapBalance: z.coerce.number().min(0).default(0),
});

export const leaveBalanceAdjustSchema = z.object({
  clBalance: z.coerce.number().min(0),
  lapBalance: z.coerce.number().min(0),
  lhapBalance: z.coerce.number().min(0),
  reason: z.string().optional(),
});

export const holidaySchema = z.object({
  date: z.coerce.date(),
  name: z.string().min(1),
});

export type HolidayWorkInput = z.infer<typeof holidayWorkSchema>;
export type LeaveRecordInput = z.infer<typeof leaveRecordSchema>;
export type LeaveBalanceAdjustInput = z.infer<typeof leaveBalanceAdjustSchema>;
export type NightDutyInput = z.infer<typeof nightDutySchema>;
export type TravelInput = z.infer<typeof travelSchema>;
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;
export type PaySettingsInput = z.infer<typeof paySettingsSchema>;

export { WorkEventType, EventDomain, LeaveType, ClaimStatus, LeaveDuration };
