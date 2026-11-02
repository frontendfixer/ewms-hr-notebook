import Link from "next/link";
import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/reports/print-button";
import { CLAIM_STATUS_LABELS } from "@/lib/design-tokens";
import {
  parseReportMonth,
  reportMonthKey,
  reportService,
  type ReportMonth,
  type SettlementInfo,
} from "@/lib/services/report-service";
import { formatCurrency, formatCurrencyExact, formatDate, formatShortDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { format } from "date-fns";

function shiftMonth({ year, month }: ReportMonth, delta: number): ReportMonth {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function CsvLink({ kind, month }: { kind: string; month: string }) {
  return (
    <a
      href={`/api/export/monthly?kind=${kind}&month=${month}`}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline print:hidden"
    >
      <Download className="h-3.5 w-3.5" />
      CSV
    </a>
  );
}

function SettlementLine({ info }: { info: SettlementInfo }) {
  if (!info) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Claim status:{" "}
      <Link href={`/claims/${info.id}`} className="font-medium text-primary hover:underline">
        {CLAIM_STATUS_LABELS[info.status] ?? info.status}
      </Link>
      {info.paid > 0 && ` · received ${formatCurrency(info.paid)}`}
      {info.outstanding > 0 && ` · due ${formatCurrency(info.outstanding)}`}
    </p>
  );
}

const th = "px-2 py-1.5 text-left font-medium text-muted-foreground";
const td = "px-2 py-1.5 align-top";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const month = parseReportMonth((await searchParams).month);
  const key = reportMonthKey(month);
  const [statement, fy, user] = await Promise.all([
    reportService.getMonthlyStatement(userId, month),
    reportService.getFinancialYearTotals(userId, month),
    prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
  ]);
  const monthLabel = format(new Date(month.year, month.month - 1, 1), "MMMM yyyy");
  const prev = reportMonthKey(shiftMonth(month, -1));
  const next = reportMonthKey(shiftMonth(month, 1));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Link
            href="/reports/insights"
            className="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs hover:bg-accent"
          >
            Insights
          </Link>
        </div>
      </div>

      <nav className="flex items-center justify-between gap-2 print:hidden" aria-label="Month">
        <Link
          href={`/reports?month=${prev}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hover:bg-accent"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <form className="flex items-center gap-2" action="/reports">
          <label htmlFor="report-month" className="sr-only">
            Month
          </label>
          <input
            id="report-month"
            type="month"
            name="month"
            defaultValue={key}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-xl border px-3 text-sm hover:bg-accent">
            Go
          </button>
        </form>
        <Link
          href={`/reports?month=${next}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hover:bg-accent"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </nav>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Statement — {monthLabel}</h1>
        <p className="text-sm">
          {user?.name}
          {user?.profile?.personnelNo && ` · Emp. No. ${user.profile.personnelNo}`}
          {user?.profile?.designation && ` · ${user.profile.designation}`}
          {user?.profile?.department && `, ${user.profile.department}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["NDA", formatCurrency(statement.nda.total), `${statement.nda.rows.length} nights`],
          ["TA", formatCurrency(statement.ta.total), `${statement.ta.rows.length} journeys`],
          ["CR earned", String(statement.cr.reduce((s, r) => s + r.earned, 0)), "days"],
          ["Leave taken", String(statement.leave.reduce((s, r) => s + r.days, 0)), "days"],
        ].map(([label, value, sub]) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="break-inside-avoid">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Night duty allowance — {monthLabel}</CardTitle>
          <CsvLink kind="nda" month={key} />
        </CardHeader>
        <CardContent className="space-y-2">
          {statement.nda.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No night duty this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="border-b">
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Duty</th>
                    <th className={th}>Night h</th>
                    <th className={th}>Paid h</th>
                    <th className={th}>Rate/h</th>
                    <th className={`${th} text-right`}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statement.nda.rows.map((r) => (
                    <tr key={r.date.toISOString()}>
                      <td className={td}>{formatShortDate(r.date)}</td>
                      <td className={td}>{r.duty}</td>
                      <td className={td}>{r.nightHours}</td>
                      <td className={td}>{r.weightageHours.toFixed(2)}</td>
                      <td className={td}>{formatCurrencyExact(r.hourlyRate)}</td>
                      <td className={`${td} text-right`}>{formatCurrencyExact(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t font-semibold">
                  <tr>
                    <td className={td} colSpan={5}>Total</td>
                    <td className={`${td} text-right`}>{formatCurrencyExact(statement.nda.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <SettlementLine info={statement.nda.settlement} />
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Travelling allowance — {monthLabel}</CardTitle>
          <CsvLink kind="ta" month={key} />
        </CardHeader>
        <CardContent className="space-y-2">
          {statement.ta.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No journeys this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="border-b">
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Route</th>
                    <th className={th}>Away</th>
                    <th className={th}>Claim</th>
                    <th className={`${th} text-right`}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statement.ta.rows.map((r, i) => (
                    <tr key={`${r.date.toISOString()}-${i}`}>
                      <td className={td}>{formatShortDate(r.date)}</td>
                      <td className={td}>
                        {r.route}
                        {r.purpose && (
                          <span className="block text-xs text-muted-foreground">{r.purpose}</span>
                        )}
                      </td>
                      <td className={td}>{r.away || "—"}</td>
                      <td className={td}>
                        {r.claimPercent}% × {formatCurrency(r.dailyRate)}
                      </td>
                      <td className={`${td} text-right`}>{formatCurrencyExact(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t font-semibold">
                  <tr>
                    <td className={td} colSpan={4}>Total</td>
                    <td className={`${td} text-right`}>{formatCurrencyExact(statement.ta.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <SettlementLine info={statement.ta.settlement} />
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">CR register — earned in {monthLabel}</CardTitle>
          <CsvLink kind="cr" month={key} />
        </CardHeader>
        <CardContent>
          {statement.cr.length === 0 ? (
            <p className="text-sm text-muted-foreground">No CR earned this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="border-b">
                  <tr>
                    <th className={th}>Worked</th>
                    <th className={th}>Earned</th>
                    <th className={th}>Used</th>
                    <th className={th}>Valid till</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statement.cr.map((r) => (
                    <tr key={r.workDate.toISOString()}>
                      <td className={td}>
                        {formatShortDate(r.workDate)}
                        <span className="block text-xs text-muted-foreground">{r.dayLabel}</span>
                      </td>
                      <td className={td}>{r.earned}</td>
                      <td className={td}>{r.used}</td>
                      <td className={td}>{r.expiresAt ? formatDate(r.expiresAt) : "—"}</td>
                      <td className={td}>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Leave taken — {monthLabel}</CardTitle>
          <CsvLink kind="leave" month={key} />
        </CardHeader>
        <CardContent className="space-y-3">
          {statement.leave.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave this month.</p>
          ) : (
            <ul className="divide-y text-sm">
              {statement.leave.map((r) => (
                <li key={`${r.type}-${r.startDate.toISOString()}`} className="flex justify-between gap-2 py-1.5">
                  <span>
                    {r.type} · {formatShortDate(r.startDate)}
                    {r.endDate > r.startDate && ` – ${formatShortDate(r.endDate)}`}
                  </span>
                  <span className="font-medium">
                    {r.days} day{r.days === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Balances today: CR {statement.balances.cr} · CL {statement.balances.cl} · LAP{" "}
            {statement.balances.lap} · LHAP {statement.balances.lhap}
          </p>
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{fy.label} so far</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            NDA {formatCurrency(fy.nda)} ({fy.nights} nights) · TA {formatCurrency(fy.ta)} (
            {fy.journeys} journeys)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
