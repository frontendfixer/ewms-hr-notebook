import { describe, expect, it } from "vitest";
import { ClaimStatus } from "@/generated/prisma/client";
import {
  aggregateChildStatuses,
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
