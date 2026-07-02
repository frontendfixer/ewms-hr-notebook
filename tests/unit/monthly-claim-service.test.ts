import { describe, expect, it } from "vitest";
import { ClaimStatus } from "@/generated/prisma/client";
import {
  addToStatusBreakdown,
  aggregateChildStatuses,
  aggregateDomainClaims,
  emptyStatusBreakdown,
  getMonthKey,
  settlementCorrelationId,
  settlementTitle,
} from "@/lib/services/monthly-claim-utils";

describe("monthly-claim-service helpers", () => {
  it("extracts calendar month from a date", () => {
    expect(getMonthKey(new Date(2025, 4, 26))).toEqual({ year: 2025, month: 5 });
    expect(getMonthKey(new Date(2026, 1, 1))).toEqual({ year: 2026, month: 2 });
  });

  it("builds stable settlement correlation ids", () => {
    expect(
      settlementCorrelationId("TRAVEL", 2025, 5),
    ).toBe("claim-settlement:TRAVEL:2025-05");
    expect(
      settlementCorrelationId("NIGHT_DUTY", 2026, 2),
    ).toBe("claim-settlement:NIGHT_DUTY:2026-02");
  });

  it("formats settlement titles", () => {
    expect(settlementTitle("TRAVEL", 2025, 5)).toBe(
      "Travel — May 2025",
    );
    expect(settlementTitle("NIGHT_DUTY", 2026, 2)).toBe(
      "Night Duty — February 2026",
    );
  });

  it("aggregates child statuses conservatively", () => {
    expect(
      aggregateChildStatuses([
        ClaimStatus.PAID,
        ClaimStatus.PAID,
        ClaimStatus.PAID,
      ]),
    ).toBe(ClaimStatus.PAID);

    expect(
      aggregateChildStatuses([
        ClaimStatus.PAID,
        ClaimStatus.DRAFT,
      ]),
    ).toBe(ClaimStatus.DRAFT);

    expect(
      aggregateChildStatuses([
        ClaimStatus.BILL_SUBMITTED,
        ClaimStatus.PASSED,
      ]),
    ).toBe(ClaimStatus.BILL_SUBMITTED);

    expect(
      aggregateChildStatuses([
        ClaimStatus.PASSED,
        ClaimStatus.PASSED,
      ]),
    ).toBe(ClaimStatus.PASSED);
  });
});

describe("claim stats aggregation", () => {
  it("initializes empty status breakdown", () => {
    const breakdown = emptyStatusBreakdown();
    expect(breakdown.DRAFT).toEqual({ amount: 0, count: 0 });
    expect(breakdown.PAID).toEqual({ amount: 0, count: 0 });
  });

  it("aggregates domain claims by type", () => {
    const result = aggregateDomainClaims([
      { eventType: "TRAVEL_RECORDED", amount: 438 },
      { eventType: "TRAVEL_RECORDED", amount: 438 },
      { eventType: "NIGHT_DUTY_RECORDED", amount: 148 },
    ]);

    expect(result.travel).toEqual({ amount: 876, count: 2 });
    expect(result.nightDuty).toEqual({ amount: 148, count: 1 });
    expect(result.totalEntries).toBe(3);
  });

  it("adds amounts to status breakdown", () => {
    let breakdown = emptyStatusBreakdown();
    breakdown = addToStatusBreakdown(breakdown, ClaimStatus.DRAFT, 500);
    breakdown = addToStatusBreakdown(breakdown, ClaimStatus.PASSED, 300);
    breakdown = addToStatusBreakdown(breakdown, ClaimStatus.PASSED, 200);

    expect(breakdown.DRAFT).toEqual({ amount: 500, count: 1 });
    expect(breakdown.PASSED).toEqual({ amount: 500, count: 2 });
    expect(breakdown.PAID).toEqual({ amount: 0, count: 0 });
  });

  it("ignores voided status in breakdown", () => {
    const breakdown = addToStatusBreakdown(
      emptyStatusBreakdown(),
      ClaimStatus.VOIDED,
      100,
    );
    expect(breakdown.DRAFT).toEqual({ amount: 0, count: 0 });
  });
});
