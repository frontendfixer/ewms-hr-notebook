import type { LeaveType } from "@/generated/prisma/client";

/** Indian Railways leave types (Liberalised Leave Rules, 1949). */
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
  SPECIAL_CL: "Special Casual Leave (incl. compensatory)",
  JOINING_TIME: "Joining Time",
};

/** Display order in leave forms — common types first. */
export const LEAVE_TYPES_ORDERED: LeaveType[] = [
  "CL",
  "LAP",
  "LHAP",
  "COMMUTED",
  "SPECIAL_CL",
  "LND",
  "EOL",
  "STUDY",
  "WRIIL",
  "PATERNITY",
  "MATERNITY",
  "CCL",
  "CHILD_ADOPTION",
  "JOINING_TIME",
];
