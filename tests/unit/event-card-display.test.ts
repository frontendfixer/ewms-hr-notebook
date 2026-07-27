import { describe, expect, it } from "vitest";
import { formatEventCardDisplay } from "@/lib/event-card-display";

describe("formatEventCardDisplay CR credits", () => {
  const occurredAt = new Date("2026-07-17T00:00:00.000Z");

  it("shows CR date, expiry, and leave applied date", () => {
    const result = formatEventCardDisplay(
      "CR",
      "+1 CR earned (expires 17 Oct 2026)",
      occurredAt,
      { amount: 1, expiresAt: "2026-10-17T00:00:00.000Z" },
      "CR_CREDIT_ISSUED",
      { leaveAppliedAt: new Date("2026-08-20T00:00:00.000Z") },
    );

    expect(result.headline).toBe("+1 CR earned");
    expect(result.details).toEqual([
      "CR date 17 Jul 2026",
      "Expires 17 Oct 2026",
      "Leave applied 20 Aug 2026",
    ]);
  });

  it("shows placeholder when leave has not been applied", () => {
    const result = formatEventCardDisplay(
      "CR",
      "+1 CR earned (expires 17 Oct 2026)",
      occurredAt,
      { amount: 1, expiresAt: "2026-10-17T00:00:00.000Z" },
      "CR_CREDIT_ISSUED",
    );

    expect(result.details).toEqual([
      "CR date 17 Jul 2026",
      "Expires 17 Oct 2026",
      "Leave applied —",
    ]);
  });
});
