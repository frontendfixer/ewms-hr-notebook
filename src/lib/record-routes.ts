export const RECORD_TYPES = ["all", "cr", "leave", "night", "ta"] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export function isTimeOrStatusFilter(
  filter: string | null | undefined,
): filter is "pending" | "month" | "year" {
  return filter === "pending" || filter === "month" || filter === "year";
}

export function parseRecordTypeFromPath(pathname: string): RecordType {
  const match = pathname.match(/^\/records\/([^/?]+)/);
  const segment = match?.[1];
  if (
    segment === "all" ||
    segment === "cr" ||
    segment === "leave" ||
    segment === "night" ||
    segment === "ta"
  ) {
    return segment;
  }
  return "all";
}
