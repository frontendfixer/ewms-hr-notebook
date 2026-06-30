import { describe, it, expect } from "vitest";
import { isSunday, addDays } from "@/lib/utils";

describe("utils", () => {
  it("detects Sunday", () => {
    expect(isSunday(new Date("2026-06-28"))).toBe(true);
    expect(isSunday(new Date("2026-06-29"))).toBe(false);
  });

  it("adds days", () => {
    const d = new Date("2026-01-01");
    expect(addDays(d, 90).toISOString().split("T")[0]).toBe("2026-04-01");
  });
});

describe("claim status flow", () => {
  it("defines ordered statuses", () => {
    const flow: Record<string, string | null> = {
      DRAFT: "BILL_SUBMITTED",
      BILL_SUBMITTED: "PASSED",
      PASSED: "PAID",
      PAID: null,
      VOIDED: null,
    };
    expect(flow.DRAFT).toBe("BILL_SUBMITTED");
    expect(flow.PAID).toBeNull();
  });
});
