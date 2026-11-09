import { EventDomain } from "@/generated/prisma/client";
import type { TimelineType } from "@/lib/timeline-filters";

/** Domain a timeline entry-type filter maps to; "pending" spans domains. */
export function timelineDomain(type: TimelineType): EventDomain | undefined {
  return type === "all" || type === "pending" ? undefined : EventDomain[type];
}
