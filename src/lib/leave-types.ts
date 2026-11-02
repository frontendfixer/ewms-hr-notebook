import type { LeaveType } from "@/generated/prisma/client";

/** Indian Railways leave types (Indian Railway Establishment Code Vol. I, Chapter V). */
export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  LAP: "Leave on Average Pay (LAP)",
  LHAP: "Leave on Half Average Pay (LHAP)",
  COMMUTED: "Commuted Leave",
  LND: "Leave Not Due (LND)",
  EOL: "Extraordinary Leave (EOL)",
  STUDY: "Study Leave",
  WRIIL: "Work Related Illness & Injury Leave",
  PATERNITY: "Paternity Leave",
  MATERNITY: "Maternity Leave",
  CCL: "Child Care Leave (CCL)",
  CHILD_ADOPTION: "Child Adoption Leave",
  CL: "Casual Leave (CL)",
  SPECIAL_CL: "Special Casual Leave",
  JOINING_TIME: "Joining Time",
};

export const LEAVE_TYPE_SHORT_LABELS: Record<LeaveType, string> = {
  LAP: "LAP",
  LHAP: "LHAP",
  COMMUTED: "Commuted leave",
  LND: "LND",
  EOL: "EOL",
  STUDY: "Study leave",
  WRIIL: "WRIIL",
  PATERNITY: "Paternity leave",
  MATERNITY: "Maternity leave",
  CCL: "CCL",
  CHILD_ADOPTION: "Child adoption leave",
  CL: "CL",
  SPECIAL_CL: "Special CL",
  JOINING_TIME: "Joining time",
};

/** Leave types shown on the take-leave form (excludes removed / admin-only types). */
export const LEAVE_TYPES_FORM: LeaveType[] = [
  "CL",
  "LAP",
  "LHAP",
  "SPECIAL_CL",
  "PATERNITY",
  "MATERNITY",
  "CCL",
];

/** Only these leave types deduct from the user's leave balance ledger. */
export const BALANCE_DEDUCTING_LEAVE_TYPES: LeaveType[] = ["CL", "LAP", "LHAP"];

export function isBalanceDeductingLeaveType(type: LeaveType): boolean {
  return BALANCE_DEDUCTING_LEAVE_TYPES.includes(type);
}

/** @deprecated Use LEAVE_TYPES_FORM */
export const LEAVE_TYPES_ORDERED = LEAVE_TYPES_FORM;
