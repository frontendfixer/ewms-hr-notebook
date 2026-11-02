import { NextResponse, type NextRequest } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import {
  parseReportMonth,
  reportMonthKey,
  reportService,
} from "@/lib/services/report-service";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/utils";

const KINDS = ["nda", "ta", "cr", "leave"] as const;
type Kind = (typeof KINDS)[number];

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const params = request.nextUrl.searchParams;
  const month = parseReportMonth(params.get("month") ?? undefined);
  const kindParam = params.get("kind") ?? "nda";
  if (!KINDS.includes(kindParam as Kind)) {
    return NextResponse.json({ error: "Unknown report kind" }, { status: 400 });
  }
  const kind = kindParam as Kind;
  const s = await reportService.getMonthlyStatement(userId, month);

  let rows: (string | number | null)[][];
  if (kind === "nda") {
    rows = [
      ["Date", "Duty", "Night hours", "Paid hours (weightage)", "Hourly rate", "DA %", "Amount", "Remarks"],
      ...s.nda.rows.map((r) => [
        formatDate(r.date),
        r.duty,
        r.nightHours,
        r.weightageHours,
        r.hourlyRate,
        r.daPercent,
        r.amount,
        r.remarks,
      ]),
      ["Total", "", "", "", "", "", s.nda.total, ""],
    ];
  } else if (kind === "ta") {
    rows = [
      ["Date", "Route", "Purpose", "Away (time)", "Daily rate", "Claim %", "Amount", "Remarks"],
      ...s.ta.rows.map((r) => [
        formatDate(r.date),
        r.route,
        r.purpose,
        r.away,
        r.dailyRate,
        r.claimPercent,
        r.amount,
        r.remarks,
      ]),
      ["Total", "", "", "", "", "", s.ta.total, ""],
    ];
  } else if (kind === "cr") {
    rows = [
      ["Work date", "Day", "Earned", "Used", "Balance", "Valid till", "Status"],
      ...s.cr.map((r) => [
        formatDate(r.workDate),
        r.dayLabel,
        r.earned,
        r.used,
        r.balance,
        r.expiresAt ? formatDate(r.expiresAt) : "",
        r.status,
      ]),
    ];
  } else {
    rows = [
      ["Type", "From", "To", "Days", "Reason"],
      ...s.leave.map((r) => [
        r.type,
        formatDate(r.startDate),
        formatDate(r.endDate),
        r.days,
        r.reason,
      ]),
    ];
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${kind}-${reportMonthKey(month)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
