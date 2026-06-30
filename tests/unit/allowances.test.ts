import { describe, expect, it } from "vitest";
import {
  calculateNdaPerNight,
  calculateNdaTotal,
  calculateTaAmount,
  dearnessAllowanceFromPercent,
  effectiveNightDutyHours,
} from "@/lib/calculations/allowances";

describe("allowances", () => {
  const basicPay = 56000;
  const daPercent = 54;
  const da = dearnessAllowanceFromPercent(basicPay, daPercent);

  it("calculates DA from basic pay percent", () => {
    expect(da).toBe(30240);
  });

  it("calculates NDA per night", () => {
    expect(calculateNdaPerNight(basicPay, da)).toBe(431.2);
  });

  it("calculates NDA for multiple nights", () => {
    expect(calculateNdaTotal(basicPay, da, 3)).toBe(1293.6);
  });

  it("calculates TA at 100%", () => {
    expect(calculateTaAmount(625, 100)).toBe(625);
  });

  it("calculates TA at partial claim percent", () => {
    expect(calculateTaAmount(625, 70)).toBe(437.5);
    expect(calculateTaAmount(625, 30)).toBe(187.5);
  });

  it("adds bonus minutes to night duty hours", () => {
    expect(effectiveNightDutyHours(8)).toBeCloseTo(9.333, 2);
  });
});
