import { CLAIM_STATUS_LABELS } from "@/lib/design-tokens";

/**
 * Entries a user records directly. CR is edited through the credit the cards
 * show, or the holiday-work event behind it.
 */
const EDITABLE_EVENT_TYPES = new Set([
  "HOLIDAY_WORK_RECORDED",
  "CR_CREDIT_ISSUED",
  "LEAVE_RECORDED",
  "NIGHT_DUTY_RECORDED",
  "TRAVEL_RECORDED",
]);

export function isEditableEventType(eventType: string): boolean {
  return EDITABLE_EVENT_TYPES.has(eventType);
}

/**
 * Why an entry can't be edited right now, or null when it can. Claims are
 * locked once their monthly bill leaves draft; CR is locked while a leave
 * uses it.
 */
export function editLockReason({
  eventType,
  claimStatus,
  crUsedBy,
}: {
  eventType: string;
  claimStatus?: string | null;
  crUsedBy?: string | null;
}): string | null {
  if (!isEditableEventType(eventType)) return "This entry can't be edited";
  if (claimStatus && claimStatus !== "DRAFT") {
    return `Its monthly bill is "${CLAIM_STATUS_LABELS[claimStatus] ?? claimStatus}". Undo the bill's status steps to edit it.`;
  }
  if (crUsedBy) {
    return `This CR is used by “${crUsedBy}”. Edit or delete that leave first.`;
  }
  return null;
}
