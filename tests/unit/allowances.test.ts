import { describe, expect, it } from "vitest";
import {
  calculateNda,
  calculateTaAmount,
  dailyAllowanceRate,
  dailyAllowanceSlabPercent,
  daPercentOn,
  dearnessAllowanceFromPercent,
  ndaHourlyRate,
  ndaWeightageHours,
  nightWindowMinutes,
  officialDaPercentOn,
  taRateFor,
  tourClaimPercent,
  tourDaySlabs,
} from "@/lib/calculations/allowances";

describe("dearness allowance", () => {
  it("calculates DA from basic pay percent", () => {
    expect(dearnessAllowanceFromPercent(56000, 54)).toBe(30240);
  });

  it("picks the official DA rate by date", () => {
    expect(officialDaPercentOn(new Date(2025, 11, 31))).toBe(58);
    expect(officialDaPercentOn(new Date(2026, 0, 1))).toBe(60);
    expect(officialDaPercentOn(new Date(2024, 6, 1))).toBe(53);
    expect(officialDaPercentOn(new Date(2020, 0, 1))).toBeNull();
  });

  it("prefers the user's override", () => {
    expect(daPercentOn(new Date(2026, 5, 1), 62)).toBe(62);
    expect(daPercentOn(new Date(2026, 5, 1), null)).toBe(60);
  });
});

describe("night duty allowance (RBE 36/2018, 83/2020)", () => {
  it("counts minutes inside 22:00–06:00", () => {
    expect(nightWindowMinutes("22:00", "06:00")).toBe(480);
    expect(nightWindowMinutes("20:00", "08:00")).toBe(480);
    expect(nightWindowMinutes("00:00", "08:00")).toBe(360);
    expect(nightWindowMinutes("14:00", "22:00")).toBe(0);
    expect(nightWindowMinutes("18:00", "02:00")).toBe(240);
    expect(nightWindowMinutes("05:00", "13:00")).toBe(60);
  });

  it("pays 10 minutes of weightage per night hour", () => {
    expect(ndaWeightageHours(480)).toBeCloseTo(8 / 6, 6);
  });

  it("caps basic pay at ₹43,600 for the hourly rate", () => {
    // (43600 + 60% DA) / 200 = 69760 / 200
    expect(ndaHourlyRate(56000, 60)).toBe(348.8);
    expect(ndaHourlyRate(41000, 7)).toBe(219.35);
  });

  it("matches the Railway Board worked example", () => {
    // RBE 36/2018: 6 nights × 80 min = 8 h at (41000 + 7%)/200 = ₹1,754.80
    const perNight = calculateNda(41000, 7).amount;
    expect(Math.round(perNight * 6 * 100) / 100).toBeCloseTo(1754.8, 1);
  });

  it("calculates a full night", () => {
    const nda = calculateNda(56000, 60);
    expect(nda.nightMinutes).toBe(480);
    expect(nda.ndaBasicPay).toBe(43600);
    expect(nda.amount).toBe(465.07);
  });
});

describe("daily allowance on tour (RBE 51/2024)", () => {
  it("uses the pay-level rate raised 25% once DA crosses 50%", () => {
    expect(dailyAllowanceRate(1, 60)).toBe(625);
    expect(dailyAllowanceRate(5, 60)).toBe(625);
    expect(dailyAllowanceRate(6, 60)).toBe(1000);
    expect(dailyAllowanceRate(9, 60)).toBe(1125);
    expect(dailyAllowanceRate(12, 60)).toBe(1250);
    expect(dailyAllowanceRate(14, 60)).toBe(1500);
    expect(dailyAllowanceRate(6, 46)).toBe(800);
    expect(dailyAllowanceRate(6, 100)).toBe(1200);
  });

  it("honours a rate override", () => {
    expect(
      taRateFor({ payLevel: 6, taRateOverride: 700, daPercentOverride: null }, new Date()),
    ).toBe(700);
  });

  it("applies the hours-absent slab", () => {
    expect(dailyAllowanceSlabPercent(0)).toBe(0);
    expect(dailyAllowanceSlabPercent(5)).toBe(30);
    expect(dailyAllowanceSlabPercent(6)).toBe(30);
    expect(dailyAllowanceSlabPercent(8)).toBe(70);
    expect(dailyAllowanceSlabPercent(13)).toBe(100);
  });

  it("splits a tour into calendar days", () => {
    const dep = new Date(2026, 9, 5, 8, 0);
    const arr = new Date(2026, 9, 6, 15, 0);
    const days = tourDaySlabs(dep, arr);
    expect(days.map((d) => [d.date, d.hours, d.percent])).toEqual([
      ["2026-10-05", 16, 100],
      ["2026-10-06", 15, 100],
    ]);
    expect(tourClaimPercent(new Date(2026, 9, 5, 9), new Date(2026, 9, 5, 17))).toBe(70);
    expect(tourClaimPercent(arr, dep)).toBe(0);
  });

  it("calculates TA at a claim percent", () => {
    expect(calculateTaAmount(625, 100)).toBe(625);
    expect(calculateTaAmount(625, 70)).toBe(437.5);
    expect(calculateTaAmount(1000, 170)).toBe(1700);
  });
});
