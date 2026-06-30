import { EventDomain } from "@/generated/prisma/client";
import {
  RECORD_TYPES,
  type RecordType,
  isTimeOrStatusFilter,
} from "@/lib/record-routes";

export type { RecordType };
export { RECORD_TYPES, isTimeOrStatusFilter };

export function parseRecordType(type: string): RecordType | null {
  if (RECORD_TYPES.includes(type as RecordType)) {
    return type as RecordType;
  }
  return null;
}

export function recordTypeToDomain(type: RecordType): EventDomain | undefined {
  switch (type) {
    case "cr":
      return EventDomain.CR;
    case "leave":
      return EventDomain.LEAVE;
    case "night":
      return EventDomain.NIGHT_DUTY;
    case "ta":
      return EventDomain.TRAVEL;
    default:
      return undefined;
  }
}

export const RECORD_TYPE_TITLES: Record<RecordType, string> = {
  all: "All Records",
  cr: "My CR",
  leave: "My Leave",
  night: "Night Duty",
  ta: "Travel",
};

export function getFilterDates(filter: string | undefined) {
  const now = new Date();
  if (filter === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (filter === "year") {
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
  return {};
}

/** Legacy domain keys used in timeline ?filter= query URLs. */
export const DOMAIN_FILTER_TO_DOMAIN: Record<string, EventDomain> = {
  CR: EventDomain.CR,
  LEAVE: EventDomain.LEAVE,
  NIGHT_DUTY: EventDomain.NIGHT_DUTY,
  TRAVEL: EventDomain.TRAVEL,
};

export function domainFromFilter(filter: string | undefined): EventDomain | undefined {
  if (!filter) return undefined;
  return DOMAIN_FILTER_TO_DOMAIN[filter];
}
