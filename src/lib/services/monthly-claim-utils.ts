import { ClaimStatus, EventDomain } from "@/generated/prisma/client";
import { format } from "date-fns";

export type MonthKey = { year: number; month: number };
export type ClaimSettlementDomain = Extract<EventDomain, "TRAVEL" | "NIGHT_DUTY">;

export function getMonthKey(date: Date): MonthKey {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function settlementCorrelationId(
  domain: EventDomain,
  year: number,
  month: number,
): string {
  return `claim-settlement:${domain}:${year}-${String(month).padStart(2, "0")}`;
}

export function settlementTitle(
  domain: EventDomain,
  year: number,
  month: number,
): string {
  const label = domain === "TRAVEL" ? "Travel" : "Night Duty";
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");
  return `${label} — ${monthLabel}`;
}

export function aggregateChildStatuses(statuses: ClaimStatus[]): ClaimStatus {
  const active = statuses.filter((s) => s !== ClaimStatus.VOIDED);
  if (active.length === 0) return ClaimStatus.DRAFT;
  if (active.every((s) => s === ClaimStatus.PAID)) return ClaimStatus.PAID;
  if (active.some((s) => s === ClaimStatus.DRAFT)) return ClaimStatus.DRAFT;
  const nonPaid = active.filter((s) => s !== ClaimStatus.PAID);
  if (nonPaid.every((s) => s === ClaimStatus.PASSED)) return ClaimStatus.PASSED;
  if (nonPaid.some((s) => s === ClaimStatus.BILL_SUBMITTED)) {
    return ClaimStatus.BILL_SUBMITTED;
  }
  if (nonPaid.some((s) => s === ClaimStatus.PASSED)) return ClaimStatus.PASSED;
  return ClaimStatus.DRAFT;
}
