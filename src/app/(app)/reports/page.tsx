import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { MonthPicker } from "@/components/reports/month-picker";
import { PrintButton } from "@/components/reports/print-button";
import {
  CrSection,
  FinancialYearCard,
  LeaveSection,
  NdaSection,
  SummaryCard,
  TaSection,
} from "@/components/reports/report-blocks";
import {
  parseReportMonth,
  reportMonthKey,
  reportService,
} from "@/lib/services/report-service";
import {
  currentReportMonth,
  isSameMonth,
  monthLabel,
  shiftMonth,
  shortMonthLabel,
} from "@/lib/report-summary";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const month = parseReportMonth((await searchParams).month);
  const key = reportMonthKey(month);
  const prevMonth = shiftMonth(month, -1);

  const [statement, fy, user] = await Promise.all([
    reportService.getMonthlyStatement(userId, month),
    reportService.getFinancialYearTotals(userId, month),
    prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
  ]);

  // The previous month is already in the year's series, except for April
  // (its predecessor, March, belongs to the last financial year).
  const inSeries = fy.months.find(
    (m) => m.year === prevMonth.year && m.month === prevMonth.month,
  );
  const previousTotal = inSeries
    ? inSeries.amount
    : await reportService.getMonthClaimTotal(userId, prevMonth);

  const label = monthLabel(month);
  const onCurrentMonth = isSameMonth(month, currentReportMonth());

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3">
      <header className="flex items-center justify-between gap-3 px-1 print:hidden">
        <h1 className="text-lg font-semibold leading-tight">Reports</h1>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Link
            href="/reports/insights"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Insights
          </Link>
        </div>
      </header>

      <MonthPicker
        monthKey={key}
        label={label}
        prevHref={`/reports?month=${reportMonthKey(prevMonth)}`}
        nextHref={`/reports?month=${reportMonthKey(shiftMonth(month, 1))}`}
        currentHref={onCurrentMonth ? null : "/reports"}
      />

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Statement — {label}</h1>
        <p className="text-sm">
          {user?.name}
          {user?.profile?.personnelNo && ` · Emp. No. ${user.profile.personnelNo}`}
          {user?.profile?.designation && ` · ${user.profile.designation}`}
          {user?.profile?.department && `, ${user.profile.department}`}
        </p>
      </div>

      <SummaryCard
        nda={statement.nda.total}
        ta={statement.ta.total}
        ndaCount={statement.nda.rows.length}
        taCount={statement.ta.rows.length}
        previousTotal={previousTotal}
        previousLabel={`${shortMonthLabel(prevMonth).split(" ")[0]}`}
        monthName={label}
        claims={[
          { total: statement.nda.total, settlement: statement.nda.settlement },
          { total: statement.ta.total, settlement: statement.ta.settlement },
        ]}
        crEarned={statement.cr.reduce((s, r) => s + r.earned, 0)}
        crUsed={statement.cr.reduce((s, r) => s + r.used, 0)}
        leaveDays={statement.leave.reduce((s, r) => s + r.days, 0)}
        leaveCount={statement.leave.length}
        balances={statement.balances}
      />

      <NdaSection
        rows={statement.nda.rows}
        total={statement.nda.total}
        settlement={statement.nda.settlement}
        monthKey={key}
      />
      <TaSection
        rows={statement.ta.rows}
        total={statement.ta.total}
        settlement={statement.ta.settlement}
        monthKey={key}
      />
      <CrSection rows={statement.cr} monthKey={key} />
      <LeaveSection rows={statement.leave} monthKey={key} />

      <FinancialYearCard fy={fy} selected={month} />
    </div>
  );
}
