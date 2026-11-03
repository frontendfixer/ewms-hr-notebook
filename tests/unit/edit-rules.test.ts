import { describe, expect, it } from "vitest";
import { editLockReason, isEditableEventType } from "@/lib/edit-rules";

describe("isEditableEventType", () => {
  it("allows entries the user records", () => {
    for (const type of [
      "HOLIDAY_WORK_RECORDED",
      "CR_CREDIT_ISSUED",
      "LEAVE_RECORDED",
      "NIGHT_DUTY_RECORDED",
      "TRAVEL_RECORDED",
    ]) {
      expect(isEditableEventType(type)).toBe(true);
    }
  });

  it("rejects settlements, status steps and history records", () => {
    for (const type of [
      "MONTHLY_CLAIM_SETTLEMENT",
      "BILL_SUBMITTED",
      "PAYMENT_RECEIVED",
      "EVENT_VOIDED",
      "CR_CONSUMED",
      "LEAVE_LEDGER_ADJUSTMENT",
    ]) {
      expect(isEditableEventType(type)).toBe(false);
    }
  });
});

describe("editLockReason", () => {
  it("leaves a draft claim editable", () => {
    expect(
      editLockReason({ eventType: "NIGHT_DUTY_RECORDED", claimStatus: "DRAFT" }),
    ).toBeNull();
  });

  it("locks a claim once its bill leaves draft", () => {
    for (const status of ["BILL_SUBMITTED", "PASSED", "PAID"]) {
      expect(
        editLockReason({ eventType: "TRAVEL_RECORDED", claimStatus: status }),
      ).toMatch(/Undo the bill's status steps/);
    }
  });

  it("locks CR used by a leave and names it", () => {
    expect(
      editLockReason({ eventType: "CR_CREDIT_ISSUED", crUsedBy: "CR leave — 3 Nov 2026" }),
    ).toContain("CR leave — 3 Nov 2026");
    expect(editLockReason({ eventType: "CR_CREDIT_ISSUED", crUsedBy: null })).toBeNull();
  });

  it("always allows leave", () => {
    expect(editLockReason({ eventType: "LEAVE_RECORDED" })).toBeNull();
  });

  it("locks types that can't be edited", () => {
    expect(editLockReason({ eventType: "EVENT_VOIDED" })).not.toBeNull();
  });
});
