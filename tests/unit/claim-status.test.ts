import { describe, expect, it } from "vitest";
import { resolveClaimStatus, statusFromEvents } from "@/lib/claim-status";

const at = (iso: string) => new Date(iso);
const ev = (
  id: string,
  eventType: string,
  recordedAt: string,
  payload: unknown = {},
) => ({ id, eventType: eventType as never, payload, recordedAt: at(recordedAt) });

describe("statusFromEvents", () => {
  it("starts as draft and follows the steps in order", () => {
    const settlement = ev("s", "MONTHLY_CLAIM_SETTLEMENT", "2026-10-01T00:00:00Z");
    expect(statusFromEvents("s", [settlement])).toBe("DRAFT");
    expect(
      statusFromEvents("s", [settlement, ev("b", "BILL_SUBMITTED", "2026-11-01T00:00:00Z")]),
    ).toBe("BILL_SUBMITTED");
    expect(
      statusFromEvents("s", [
        settlement,
        ev("b", "BILL_SUBMITTED", "2026-11-01T00:00:00Z"),
        ev("p", "CLAIM_PASSED", "2026-11-02T00:00:00Z"),
        ev("m", "PAYMENT_RECEIVED", "2026-11-03T00:00:00Z"),
      ]),
    ).toBe("PAID");
  });

  it("uses the entry's own stored status for standalone claims", () => {
    expect(
      statusFromEvents("n", [
        ev("n", "NIGHT_DUTY_RECORDED", "2026-10-01T00:00:00Z", { currentStatus: "PASSED" }),
      ]),
    ).toBe("PASSED");
  });

  it("ignores another entry's stored status", () => {
    expect(
      statusFromEvents("s", [
        ev("x", "NIGHT_DUTY_RECORDED", "2026-10-01T00:00:00Z", { currentStatus: "PAID" }),
      ]),
    ).toBe("DRAFT");
  });

  it("follows a status-changed fallback event", () => {
    expect(
      statusFromEvents("s", [ev("c", "STATUS_CHANGED", "2026-11-01T00:00:00Z", { to: "PASSED" })]),
    ).toBe("PASSED");
  });
});

describe("resolveClaimStatus", () => {
  const payment = ev("m", "PAYMENT_RECEIVED", "2026-11-03T00:00:00Z");

  it("keeps a paid month paid", () => {
    expect(resolveClaimStatus("PAID", at("2026-12-01T00:00:00Z"), [payment])).toBe("PAID");
  });

  it("keeps an entry paid when it was added before a payment on a reopened month", () => {
    expect(resolveClaimStatus("DRAFT", at("2026-11-01T00:00:00Z"), [payment])).toBe("PAID");
  });

  it("leaves an entry added after the payment on the month's status", () => {
    expect(resolveClaimStatus("BILL_SUBMITTED", at("2026-11-10T00:00:00Z"), [payment])).toBe(
      "BILL_SUBMITTED",
    );
  });
});
