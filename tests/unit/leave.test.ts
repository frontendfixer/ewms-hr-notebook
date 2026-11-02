import { describe, expect, it } from "vitest";
import {
  allocateCrCredits,
  countLeaveDays,
  dueAccrualPeriods,
  rangesOverlap,
  validateLeaveRange,
} from "@/lib/calculations/leave";
import { toCsv } from "@/lib/csv";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("countLeaveDays", () => {
  it("counts calendar days for LAP", () => {
    // Fri 6 Nov 2026 – Mon 9 Nov 2026
    expect(countLeaveDays(d(2026, 11, 6), d(2026, 11, 9), "FULL").days).toBe(4);
  });

  it("skips Sundays and holidays for CL", () => {
    const result = countLeaveDays(d(2026, 11, 6), d(2026, 11, 9), "FULL", {
      excludeHolidays: true,
      holidayKeys: new Set(["2026-11-09"]),
    });
    expect(result.days).toBe(2);
    expect(result.excludedDays).toEqual(["2026-11-08", "2026-11-09"]);
  });

  it("counts half a day", () => {
    expect(countLeaveDays(d(2026, 11, 6), d(2026, 11, 6), "FIRST_HALF").days).toBe(0.5);
  });
});

describe("validateLeaveRange", () => {
  it("rejects reversed and multi-day half-day ranges", () => {
    expect(validateLeaveRange(d(2026, 11, 9), d(2026, 11, 6), "FULL")).toMatch(/End date/);
    expect(validateLeaveRange(d(2026, 11, 6), d(2026, 11, 7), "FIRST_HALF")).toMatch(/single date/);
    expect(validateLeaveRange(d(2026, 11, 6), d(2026, 11, 6), "SECOND_HALF")).toBeNull();
  });
});

describe("rangesOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(rangesOverlap(d(2026, 1, 1), d(2026, 1, 3), d(2026, 1, 3), d(2026, 1, 5))).toBe(true);
    expect(rangesOverlap(d(2026, 1, 1), d(2026, 1, 2), d(2026, 1, 3), d(2026, 1, 5))).toBe(false);
  });
});

describe("allocateCrCredits", () => {
  const credits = [
    { creditEventId: "late", balance: 1, expiresAt: d(2026, 12, 30), earnedAt: d(2026, 10, 1) },
    { creditEventId: "early", balance: 1, expiresAt: d(2026, 12, 1), earnedAt: d(2026, 9, 1) },
    { creditEventId: "half", balance: 0.5, expiresAt: d(2026, 12, 15), earnedAt: d(2026, 9, 15) },
    { creditEventId: "expired", balance: 1, expiresAt: d(2026, 11, 5), earnedAt: d(2026, 8, 1) },
  ];

  it("uses oldest expiry first and covers all days", () => {
    const { allocations, shortfall } = allocateCrCredits(credits, 2, d(2026, 11, 10));
    expect(shortfall).toBe(0);
    expect(allocations).toEqual([
      { creditEventId: "early", amount: 1 },
      { creditEventId: "half", amount: 0.5 },
      { creditEventId: "late", amount: 0.5 },
    ]);
  });

  it("ignores credits expired by the leave date and reports a shortfall", () => {
    const { shortfall } = allocateCrCredits(credits, 4, d(2026, 11, 10));
    expect(shortfall).toBe(1.5);
  });

  it("uses preferred credits first", () => {
    const { allocations } = allocateCrCredits(credits, 1, d(2026, 11, 10), ["late"]);
    expect(allocations).toEqual([{ creditEventId: "late", amount: 1 }]);
  });

  it("does not use CR earned after the leave date", () => {
    const { shortfall } = allocateCrCredits(credits, 1, d(2026, 8, 20));
    expect(shortfall).toBe(0);
    const { allocations } = allocateCrCredits(credits, 1, d(2026, 8, 20));
    expect(allocations[0].creditEventId).toBe("expired");
  });
});

describe("dueAccrualPeriods", () => {
  it("lists CL resets and half-yearly LAP/LHAP credits after the baseline", () => {
    const periods = dueAccrualPeriods(d(2026, 3, 15), d(2027, 1, 2));
    expect(periods.map((p) => `${p.kind}:${p.periodKey}`)).toEqual([
      "LAP_HALF:2026-H2",
      "LHAP_HALF:2026-H2",
      "CL_YEAR:2027",
      "LAP_HALF:2027-H1",
      "LHAP_HALF:2027-H1",
    ]);
  });

  it("skips a period that starts on the baseline itself", () => {
    expect(dueAccrualPeriods(d(2026, 7, 1), d(2026, 7, 1))).toEqual([]);
  });
});

describe("toCsv", () => {
  it("escapes quotes, commas and formula-like text", () => {
    const csv = toCsv([
      ["a,b", 'say "hi"', "=SUM(A1)", -5],
    ]);
    expect(csv).toBe('\uFEFF"a,b","say ""hi""",\'=SUM(A1),-5');
  });
});
