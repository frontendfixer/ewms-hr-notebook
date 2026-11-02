import { toast } from "sonner";
import type { ActionResult } from "@/actions/events";

/** Show the action's error, or the success message; returns true on success. */
export function toastResult<T>(
  result: ActionResult<T>,
  success?: string,
): result is { ok: true; data?: T } {
  if (!result.ok) {
    toast.error(result.error);
    return false;
  }
  if (success) toast.success(success);
  return true;
}
