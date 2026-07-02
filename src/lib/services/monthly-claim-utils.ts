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

export type ClaimDomainSegment = {
  amount: number;
  count: number;
};

export type ClaimStatusSegment = {
  amount: number;
  count: number;
};

export type ClaimStatusBreakdown = {
  DRAFT: ClaimStatusSegment;
  BILL_SUBMITTED: ClaimStatusSegment;
  PASSED: ClaimStatusSegment;
  PAID: ClaimStatusSegment;
};

export function emptyStatusBreakdown(): ClaimStatusBreakdown {
  return {
    DRAFT: { amount: 0, count: 0 },
    BILL_SUBMITTED: { amount: 0, count: 0 },
    PASSED: { amount: 0, count: 0 },
    PAID: { amount: 0, count: 0 },
  };
}

export function emptyDomainSegment(): ClaimDomainSegment {
  return { amount: 0, count: 0 };
}

type DomainClaimInput = {
  eventType: string;
  amount: number;
};

export function aggregateDomainClaims(
  claims: DomainClaimInput[],
): { travel: ClaimDomainSegment; nightDuty: ClaimDomainSegment; totalEntries: number } {
  const travel = emptyDomainSegment();
  const nightDuty = emptyDomainSegment();

  for (const claim of claims) {
    if (claim.eventType === "TRAVEL_RECORDED") {
      travel.count++;
      travel.amount += claim.amount;
    } else if (claim.eventType === "NIGHT_DUTY_RECORDED") {
      nightDuty.count++;
      nightDuty.amount += claim.amount;
    }
  }

  return {
    travel,
    nightDuty,
    totalEntries: travel.count + nightDuty.count,
  };
}

export function addToStatusBreakdown(
  breakdown: ClaimStatusBreakdown,
  status: ClaimStatus,
  amount: number,
): ClaimStatusBreakdown {
  if (
    status !== ClaimStatus.DRAFT &&
    status !== ClaimStatus.BILL_SUBMITTED &&
    status !== ClaimStatus.PASSED &&
    status !== ClaimStatus.PAID
  ) {
    return breakdown;
  }

  return {
    ...breakdown,
    [status]: {
      amount: breakdown[status].amount + amount,
      count: breakdown[status].count + 1,
    },
  };
}
