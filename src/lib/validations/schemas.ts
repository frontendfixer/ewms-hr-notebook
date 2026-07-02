import { z } from "zod";
import {
  ClaimStatus,
  EventDomain,
  LeaveDuration,
  LeaveType,
  WorkEventType,
} from "@/generated/prisma/client";
import { startOfDay } from "@/lib/utils";

export const holidayWorkSchema = z.object({
  workDate: z.coerce.date(),
  holidayName: z.string().optional(),
  remarks: z.string().optional(),
});

export const leaveRecordSchema = z.object({
  leaveType: z.nativeEnum(LeaveType),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  duration: z.nativeEnum(LeaveDuration).default("FULL"),
  reason: z.string().optional(),
  usesCr: z.boolean().default(false),
  crCreditEventIds: z.array(z.string()).optional(),
});

export const nightDutySchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    remarks: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.endDate || startOfDay(data.endDate) >= startOfDay(data.startDate),
    { message: "End date must be on or after start date", path: ["endDate"] },
  );

export const travelSchema = z.object({
  journeyDate: z.coerce.date(),
  from: z.string().optional(),
  to: z.string().min(1, "Destination is required"),
  purpose: z.string().optional(),
  claimPercent: z.coerce.number().min(1).max(100).default(100),
  remarks: z.string().optional(),
});

export const paySettingsSchema = z.object({
  basicPay: z.coerce.number().min(0, "Basic pay must be zero or more"),
  daPercent: z.coerce
    .number()
    .min(0, "DA % must be zero or more")
    .max(100, "DA % cannot exceed 100"),
  taBaseAmount: z.coerce.number().min(1, "TA base must be at least ₹1"),
  crExpiryDays: z.coerce.number().min(1).max(365).optional(),
});

export const statusTransitionSchema = z.object({
  claimEventId: z.string(),
  toStatus: z.nativeEnum(ClaimStatus),
  billNumber: z.string().optional(),
  amount: z.coerce.number().optional(),
  paymentDate: z.coerce.date().optional(),
  paymentReference: z.string().optional(),
  remarks: z.string().optional(),
});

export const paymentSchema = z.object({
  claimEventId: z.string(),
  amount: z.coerce.number(),
  paymentDate: z.coerce.date(),
  reference: z.string().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  personnelNo: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  joinDate: z.coerce.date().optional(),
});

export const onboardingBalancesSchema = z.object({
  clBalance: z.coerce.number().default(8),
  lapBalance: z.coerce.number().default(30),
  lhapBalance: z.coerce.number().default(20),
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

export { WorkEventType, EventDomain, LeaveType, ClaimStatus, LeaveDuration };
