import type { EventDomain } from "@/generated/prisma/client";

export const STATUS_COLORS = {
  success: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800",
  warning: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800",
  info: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800",
  critical: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800",
  muted: "text-muted-foreground bg-muted border-border",
} as const;

export const DOMAIN_LABELS: Record<EventDomain, string> = {
  CR: "CR",
  LEAVE: "Leave",
  NIGHT_DUTY: "Night Duty",
  TRAVEL: "Travel",
  META: "Other",
};

/** Shared domain palette — card, icon, chips, calendar dots, report bars. */
export const DOMAIN_STYLES: Record<
  EventDomain,
  {
    card: string;
    border: string;
    icon: string;
    label: string;
    ring: string;
    dot: string;
    bar: string;
    chipActive: string;
  }
> = {
  CR: {
    card: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    label: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    chipActive: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  },
  LEAVE: {
    card: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
    label: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/20",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    chipActive: "border-rose-500/40 bg-rose-500/15 text-rose-800 dark:text-rose-200",
  },
  NIGHT_DUTY: {
    card: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    label: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-500/20",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    chipActive: "border-blue-500/40 bg-blue-500/15 text-blue-800 dark:text-blue-200",
  },
  TRAVEL: {
    card: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
    label: "text-amber-800 dark:text-amber-300",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    chipActive: "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200",
  },
  META: {
    card: "bg-muted/40",
    border: "border-border",
    icon: "bg-muted text-muted-foreground",
    label: "text-muted-foreground",
    ring: "ring-border",
    dot: "bg-muted-foreground",
    bar: "bg-muted-foreground",
    chipActive: "border-border bg-muted text-foreground",
  },
};

/** @deprecated Use DOMAIN_STYLES[domain].dot */
export const DOMAIN_DOT_COLORS: Record<EventDomain, string> = {
  CR: DOMAIN_STYLES.CR.dot,
  LEAVE: DOMAIN_STYLES.LEAVE.dot,
  NIGHT_DUTY: DOMAIN_STYLES.NIGHT_DUTY.dot,
  TRAVEL: DOMAIN_STYLES.TRAVEL.dot,
  META: DOMAIN_STYLES.META.dot,
};

export const DEFAULT_CR_EXPIRY_DAYS = 90;
export const DEFAULT_TA_BASE_AMOUNT = 625;
export const SETTING_KEYS = {
  CR_EXPIRY_DAYS: "crExpiryDays",
  CL_ENTITLEMENT: "clEntitlement",
  EL_ENTITLEMENT: "elEntitlement",
  BASIC_PAY: "basicPay",
  DA_PERCENT: "daPercent",
  TA_BASE_AMOUNT: "taBaseAmount",
} as const;

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Pending",
  BILL_SUBMITTED: "Bill Submitted",
  PASSED: "Passed",
  PAID: "Paid",
  VOIDED: "Voided",
};
