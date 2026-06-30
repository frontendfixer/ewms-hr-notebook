import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { insightService } from "@/lib/services/insight-service";

export async function GET() {
  const userId = await requireUserId();
  const now = new Date();
  const report = await insightService.getMonthlyReport(
    userId,
    now.getFullYear(),
    now.getMonth() + 1,
  );

  const rows = [
    ["domain", "count"],
    ...Object.entries(report.byDomain).map(([d, c]) => [d, String(c)]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=monthly-report.csv",
    },
  });
}
