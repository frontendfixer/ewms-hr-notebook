import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Download,
  Moon,
  Palmtree,
  Train,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CLAIM_STATUS_LABELS, DOMAIN_STYLES, claimStatusVariant } from "@/lib/design-tokens";
import type { EventDomain } from "@/generated/prisma/client";
import type { CrRow, LeaveRow, NdaRow, SettlementInfo, TaRow } from "@/lib/services/report-service";
import {
  barPercents,
  monthDelta,
  monthLabel,
  rollUpClaims,
  sharePercent,
  shortMonthLabel,
} from "@/lib/report-summary";
import type { ReportMonth } from "@/lib/report-types";
import {
  cn,
  formatCurrency,
  formatCurrencyExact,
  formatDate,
  formatDayWithWeekday,
  formatShortDate,
} from "@/lib/utils";

/** 0.5 CR and 9.6 h lose float noise but keep the fraction. */
function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function days(n: number): string {
  return `${num(n)} day${n === 1 ? "" : "s"}`;
}

// ─── Summary ───────────────────────────────────────────────────

export function SummaryCard({
  nda,
  ta,
  ndaCount,
  taCount,
  previousTotal,
  previousLabel,
  monthName,
  claims,
  crEarned,
  crUsed,
  leaveDays,
  leaveCount,
  balances,
}: {
  nda: number;
  ta: number;
  ndaCount: number;
  taCount: number;
  previousTotal: number;
  previousLabel: string;
  monthName: string;
  claims: { total: number; settlement: SettlementInfo }[];
  crEarned: number;
  crUsed: number;
  leaveDays: number;
  leaveCount: number;
  balances: { cr: number; cl: number; lap: number; lhap: number };
}) {
  const total = nda + ta;
  const delta = monthDelta(total, previousTotal);
  const bills = rollUpClaims(claims);
  const ndaShare = sharePercent(nda, total);

  return (
    <Card className="space-y-3 p-4 break-inside-avoid">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Claims in {monthName}</p>
          <p className="text-3xl font-bold leading-tight tabular-nums">{formatCurrencyExact(total)}</p>
        </div>
        {delta && (
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              delta.direction === "up" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              delta.direction === "down" && "bg-amber-500/10 text-amber-800 dark:text-amber-300",
              delta.direction === "same" && "bg-muted text-muted-foreground",
            )}
          >
            {delta.direction === "up" && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />}
            {delta.direction === "down" && <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
            {delta.direction === "same"
              ? `Same as ${previousLabel}`
              : `${formatCurrencyExact(delta.diff)} vs ${previousLabel}`}
          </span>
        )}
      </div>

      {total > 0 && (
        <div>
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`Night duty ${ndaShare}%, travel ${100 - ndaShare}%`}
          >
            <span className={cn("h-full", DOMAIN_STYLES.NIGHT_DUTY.bar)} style={{ width: `${ndaShare}%` }} />
            <span className={cn("h-full", DOMAIN_STYLES.TRAVEL.bar)} style={{ width: `${100 - ndaShare}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", DOMAIN_STYLES.NIGHT_DUTY.dot)} aria-hidden />
              NDA {formatCurrencyExact(nda)} · {ndaCount} night{ndaCount === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", DOMAIN_STYLES.TRAVEL.dot)} aria-hidden />
              TA {formatCurrencyExact(ta)} · {taCount} trip{taCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}

      {total > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {bills.unbilled > 0 && (
            <span>
              Not billed yet{" "}
              <b className="font-semibold tabular-nums text-foreground">{formatCurrencyExact(bills.unbilled)}</b>
            </span>
          )}
          {bills.billed && (
            <>
              <span>
                Received{" "}
                <b className="font-semibold tabular-nums text-foreground">{formatCurrencyExact(bills.paid)}</b>
              </span>
              {bills.outstanding > 0 && (
                <span>
                  {bills.shortPaid ? "Short by" : "Due"}{" "}
                  <b
                    className={cn(
                      "font-semibold tabular-nums",
                      bills.outstanding > 0 ? "text-amber-700 dark:text-amber-300" : "text-foreground",
                    )}
                  >
                    {formatCurrencyExact(bills.outstanding)}
                  </b>
                </span>
              )}
            </>
          )}
          {bills.allPaid && (
            <Badge variant="success" className="px-2 py-0 text-[11px]">
              All paid
            </Badge>
          )}
          {bills.shortPaid && (
            <Badge variant="warning" className="px-2 py-0 text-[11px]">
              Short-paid
            </Badge>
          )}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
        <p className="flex items-center gap-2">
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", DOMAIN_STYLES.CR.icon)}>
            <Award className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>
            <b className="block text-sm font-semibold tabular-nums">+{num(crEarned)} CR</b>
            <span className="text-muted-foreground">{crUsed > 0 ? `${num(crUsed)} used` : "earned"}</span>
          </span>
        </p>
        <p className="flex items-center gap-2">
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", DOMAIN_STYLES.LEAVE.icon)}>
            <Palmtree className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>
            <b className="block text-sm font-semibold tabular-nums">{days(leaveDays)}</b>
            <span className="text-muted-foreground">
              leave · {leaveCount} entr{leaveCount === 1 ? "y" : "ies"}
            </span>
          </span>
        </p>
      </div>

      <div>
        <p className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">Balances today</p>
        <dl className="grid grid-cols-4 gap-1 rounded-xl bg-muted/50 p-2 text-center">
          {(
            [
              ["CL", balances.cl],
              ["LAP", balances.lap],
              ["LHAP", balances.lhap],
              ["CR", balances.cr],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse">
              <dd className="text-sm font-semibold tabular-nums">{num(value)}</dd>
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

// ─── Sections ──────────────────────────────────────────────────

const SECTION_ICONS: Record<string, LucideIcon> = {
  NIGHT_DUTY: Moon,
  TRAVEL: Train,
  CR: Award,
  LEAVE: Palmtree,
};

function SettlementFooter({ info }: { info: SettlementInfo }) {
  if (!info) {
    return (
      <p className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">Not yet billed</p>
    );
  }
  // A draft bill has nothing received and nothing "due" yet.
  const draft = info.status === "DRAFT";
  const figures = [
    ...(!draft && info.paid > 0 ? [`received ${formatCurrencyExact(info.paid)}`] : []),
    ...(!draft && info.outstanding > 0 ? [`due ${formatCurrencyExact(info.outstanding)}`] : []),
  ];
  return (
    <div className="flex min-h-11 items-center gap-2 border-t border-border/60 px-4 text-xs text-muted-foreground">
      <Badge variant={claimStatusVariant(info.status)} className="shrink-0 px-2 py-0 text-[11px]">
        {CLAIM_STATUS_LABELS[info.status] ?? info.status}
      </Badge>
      {figures.length > 0 && <span className="min-w-0 flex-1">{figures.join("\u00A0· ")}</span>}
      <Link
        href={`/claims/${info.id}`}
        className="-mr-2 ml-auto flex min-h-11 shrink-0 items-center px-2 font-medium text-primary hover:underline print:hidden"
      >
        Open bill
      </Link>
    </div>
  );
}

function Section({
  domain,
  title,
  count,
  countLabel,
  total,
  csvKind,
  monthKey,
  empty,
  footer,
  children,
}: {
  domain: Exclude<EventDomain, "META">;
  title: string;
  count: number;
  countLabel: string;
  total?: string;
  csvKind: string;
  monthKey: string;
  empty: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const Icon = SECTION_ICONS[domain];
  const styles = DOMAIN_STYLES[domain];
  const tile = (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", styles.icon)}>
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );

  // An empty section costs one line instead of a card with a placeholder inside.
  if (count === 0) {
    return (
      <Card className="flex items-center gap-2.5 px-4 py-2.5 break-inside-avoid">
        {tile}
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-medium">{title}</span>
          <span className="text-muted-foreground"> · {empty}</span>
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden break-inside-avoid">
      <div className="flex items-center gap-2.5 px-4 py-3">
        {tile}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {count} {countLabel}
          </p>
        </div>
        {total && <p className="text-base font-bold tabular-nums">{total}</p>}
        <a
          href={`/api/export/monthly?kind=${csvKind}&month=${monthKey}`}
          aria-label={`Download ${title} as CSV`}
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground print:hidden"
        >
          <Download className="h-4 w-4" aria-hidden />
        </a>
      </div>
      <ul className="divide-y divide-border/60 border-t border-border/60">{children}</ul>
      {footer}
    </Card>
  );
}

function Row({
  title,
  meta,
  note,
  value,
  pill,
}: {
  title: string;
  meta: string[];
  note?: string | null;
  value?: string;
  pill?: { label: string; variant: Parameters<typeof Badge>[0]["variant"] };
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1 break-words">
        <p className="text-sm font-medium">{title}</p>
        {meta.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">{meta.join(" · ")}</p>
        )}
        {note && <p className="mt-0.5 text-xs italic text-muted-foreground/80">{note}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {value && <p className="text-sm font-semibold tabular-nums">{value}</p>}
        {pill && (
          <Badge variant={pill.variant} className="px-2 py-0 text-[11px] leading-5">
            {pill.label}
          </Badge>
        )}
      </div>
    </li>
  );
}

export function NdaSection({
  rows,
  total,
  settlement,
  monthKey,
}: {
  rows: NdaRow[];
  total: number;
  settlement: SettlementInfo;
  monthKey: string;
}) {
  return (
    <Section
      domain="NIGHT_DUTY"
      title="Night duty"
      count={rows.length}
      countLabel={rows.length === 1 ? "night" : "nights"}
      total={formatCurrencyExact(total)}
      csvKind="nda"
      monthKey={monthKey}
      empty="none this month"
      footer={<SettlementFooter info={settlement} />}
    >
      {rows.map((r) => (
        <Row
          key={r.date.toISOString()}
          title={formatDayWithWeekday(r.date)}
          meta={[
            r.duty,
            `${num(r.nightHours)}h night`,
            `${num(r.weightageHours)}h paid`,
            `${formatCurrencyExact(r.hourlyRate)}/h`,
            ...(r.daPercent != null ? [`DA ${num(r.daPercent)}%`] : []),
          ]}
          note={r.remarks}
          value={formatCurrencyExact(r.amount)}
        />
      ))}
    </Section>
  );
}

export function TaSection({
  rows,
  total,
  settlement,
  monthKey,
}: {
  rows: TaRow[];
  total: number;
  settlement: SettlementInfo;
  monthKey: string;
}) {
  return (
    <Section
      domain="TRAVEL"
      title="Travelling allowance"
      count={rows.length}
      countLabel={rows.length === 1 ? "journey" : "journeys"}
      total={formatCurrencyExact(total)}
      csvKind="ta"
      monthKey={monthKey}
      empty="no journeys this month"
      footer={<SettlementFooter info={settlement} />}
    >
      {rows.map((r, i) => (
        <Row
          key={`${r.date.toISOString()}-${i}`}
          title={r.route || "Journey"}
          meta={[
            formatDayWithWeekday(r.date),
            ...(r.away ? [r.away] : []),
            `${num(r.claimPercent)}% of ${formatCurrency(r.dailyRate)}`,
            ...(r.purpose && r.purpose !== r.route.split(" → ").at(-1) ? [r.purpose] : []),
          ]}
          note={r.remarks}
          value={formatCurrencyExact(r.amount)}
        />
      ))}
    </Section>
  );
}

/** "Sunday · 1 Nov" (the weekday is already in the label); holidays keep their weekday. */
function crTitle(r: CrRow): string {
  if (r.dayLabel === "Sunday") return `Sunday · ${formatShortDate(r.workDate)}`;
  return `${r.dayLabel ? `${r.dayLabel} · ` : ""}${formatDayWithWeekday(r.workDate)}`;
}

const CR_STATUS_VARIANT = {
  Available: "success",
  "Partly used": "warning",
  Used: "muted",
  Expired: "critical",
} as const;

export function CrSection({ rows, monthKey }: { rows: CrRow[]; monthKey: string }) {
  const earned = rows.reduce((s, r) => s + r.earned, 0);
  return (
    <Section
      domain="CR"
      title="CR earned"
      count={rows.length}
      countLabel={rows.length === 1 ? "credit" : "credits"}
      total={`+${num(earned)}`}
      csvKind="cr"
      monthKey={monthKey}
      empty="none earned this month"
    >
      {rows.map((r) => (
        <Row
          key={r.workDate.toISOString()}
          title={crTitle(r)}
          meta={[
            `Earned ${num(r.earned)}`,
            ...(r.used > 0 ? [`Used ${num(r.used)}`] : []),
            ...(r.expiresAt ? [`Valid till ${formatDate(r.expiresAt)}`] : []),
          ]}
          pill={{ label: r.status, variant: CR_STATUS_VARIANT[r.status] }}
        />
      ))}
    </Section>
  );
}

/** "CL" becomes "CL leave"; "Paternity leave" and "Joining time" already read well. */
function leaveTitle(type: string): string {
  return /leave$|time$/i.test(type) ? type : `${type} leave`;
}

function leaveRange(r: LeaveRow): string {
  return r.endDate > r.startDate
    ? `${formatDayWithWeekday(r.startDate)} – ${formatDayWithWeekday(r.endDate)}`
    : formatDayWithWeekday(r.startDate);
}

export function LeaveSection({ rows, monthKey }: { rows: LeaveRow[]; monthKey: string }) {
  const totalDays = rows.reduce((s, r) => s + r.days, 0);
  return (
    <Section
      domain="LEAVE"
      title="Leave taken"
      count={rows.length}
      countLabel={rows.length === 1 ? "entry" : "entries"}
      total={days(totalDays)}
      csvKind="leave"
      monthKey={monthKey}
      empty="none this month"
    >
      {rows.map((r) => (
        <Row
          key={`${r.type}-${r.startDate.toISOString()}`}
          title={leaveTitle(r.type)}
          meta={[leaveRange(r)]}
          note={r.reason}
          value={days(r.days)}
        />
      ))}
    </Section>
  );
}

// ─── Financial year ────────────────────────────────────────────

export function FinancialYearCard({
  fy,
  selected,
}: {
  fy: {
    label: string;
    nda: number;
    ta: number;
    nights: number;
    journeys: number;
    leaveDays: number;
    crEarned: number;
    months: { year: number; month: number; amount: number }[];
  };
  selected: ReportMonth;
}) {
  const heights = barPercents(fy.months.map((m) => m.amount));
  return (
    <Card className="space-y-3 p-4 break-inside-avoid">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{fy.label} so far</h2>
        <p className="text-base font-bold tabular-nums">{formatCurrencyExact(fy.nda + fy.ta)}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          NDA <b className="font-semibold text-foreground tabular-nums">{formatCurrencyExact(fy.nda)}</b> · {fy.nights}{" "}
          night{fy.nights === 1 ? "" : "s"}
        </span>
        <span>
          TA <b className="font-semibold text-foreground tabular-nums">{formatCurrencyExact(fy.ta)}</b> · {fy.journeys}{" "}
          trip{fy.journeys === 1 ? "" : "s"}
        </span>
        <span>
          Leave <b className="font-semibold text-foreground tabular-nums">{days(fy.leaveDays)}</b>
        </span>
        <span>
          CR earned <b className="font-semibold text-foreground tabular-nums">+{num(fy.crEarned)}</b>
        </span>
      </div>

      <ol className="grid h-20 grid-cols-12 items-end gap-1 print:hidden" aria-label="Claims by month">
        {fy.months.map((m, i) => {
          const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
          const active = m.year === selected.year && m.month === selected.month;
          return (
            <li key={key} className="h-full">
            <Link
              href={`/reports?month=${key}`}
              aria-label={`${shortMonthLabel(m)}: ${formatCurrencyExact(m.amount)}`}
              aria-current={active ? "true" : undefined}
              className="group flex h-full min-w-0 flex-col justify-end gap-1"
            >
              <span
                className={cn(
                  "w-full rounded-sm transition-colors",
                  active ? "bg-primary" : "bg-primary/25 group-hover:bg-primary/50",
                )}
                style={{ height: `${Math.max(6, Math.round(heights[i] * 0.62))}%` }}
              />
              <span
                className={cn(
                  "text-center text-[10px] leading-none",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {monthLabel(m).charAt(0)}
              </span>
            </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
