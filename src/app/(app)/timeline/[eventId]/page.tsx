import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { claimStatusService } from "@/lib/services/claim-status-service";
import { eventService } from "@/lib/services/event-service";
import { isEditableEventType } from "@/lib/edit-rules";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteEventButton } from "@/components/timeline/delete-event-button";
import { claimStatusBadge } from "@/components/ui/badge";
import { formatCurrencyExact, formatDate, cn } from "@/lib/utils";
import { DOMAIN_LABELS, LEDGER_ACCOUNT_LABELS } from "@/lib/design-tokens";
import { domainCardClass, domainLabelClass } from "@/lib/domain-styles";
import { WorkEventType } from "@/generated/prisma/client";
import { ArrowLeft, Lock, Pencil } from "lucide-react";

type ClaimPayload = {
  amount?: number;
  startTime?: string;
  endTime?: string;
  nightMinutes?: number;
  weightageHours?: number;
  hourlyRate?: number;
  ndaBasicPay?: number;
  daPercent?: number;
  from?: string;
  to?: string;
  purpose?: string;
  departureTime?: string | null;
  returnTime?: string | null;
  returnDate?: string;
  claimPercent?: number;
  dailyRate?: number;
  taBaseAmount?: number;
  beyond8Km?: boolean;
  slabs?: { date: string; hours: number; percent: number }[];
  days?: number;
  excludedDays?: string[];
  leaveType?: string;
};

function DetailRows({ rows }: { rows: [string, string | undefined][] }) {
  const visible = rows.filter(([, v]) => v != null && v !== "");
  if (visible.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {visible.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function hoursLabel(minutes?: number) {
  if (minutes == null) return undefined;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const userId = await requireUserId();
  const { eventId } = await params;

  const event = await prisma.workEvent.findFirst({
    where: { id: eventId, userId, voidedAt: null },
    include: {
      childEvents: { where: { voidedAt: null }, orderBy: { recordedAt: "asc" } },
      ledgerEntries: true,
      parentEvent: true,
    },
  });

  if (!event) notFound();
  if (event.eventType === WorkEventType.MONTHLY_CLAIM_SETTLEMENT) {
    redirect(`/claims/${event.id}`);
  }

  const isClaim =
    event.eventType === WorkEventType.NIGHT_DUTY_RECORDED ||
    event.eventType === WorkEventType.TRAVEL_RECORDED;

  const status = isClaim ? await claimStatusService.getStatus(event.id) : null;

  const monthlySettlement =
    isClaim && event.parentEvent &&
    event.parentEvent.voidedAt == null &&
    event.parentEvent.eventType === WorkEventType.MONTHLY_CLAIM_SETTLEMENT
      ? event.parentEvent
      : null;

  const editLock = isEditableEventType(event.eventType)
    ? (await eventService.getEditTarget(userId, event.id)).reason
    : undefined;

  const p = event.payload as ClaimPayload;
  const money = (n?: number) => (n != null ? formatCurrencyExact(n) : undefined);

  const detailRows: [string, string | undefined][] =
    event.eventType === WorkEventType.NIGHT_DUTY_RECORDED
      ? [
          ["Duty", p.startTime && p.endTime ? `${p.startTime} – ${p.endTime}` : "22:00 – 06:00 (assumed)"],
          ["Night hours", hoursLabel(p.nightMinutes)],
          ["Paid weightage", p.weightageHours != null ? hoursLabel(p.weightageHours * 60) : undefined],
          ["Hourly rate", money(p.hourlyRate)],
          ["Basic used", money(p.ndaBasicPay)],
          ["DA", p.daPercent != null ? `${p.daPercent}%` : undefined],
          ["NDA", money(p.amount)],
        ]
      : event.eventType === WorkEventType.TRAVEL_RECORDED
        ? [
            ["Route", [p.from, p.to].filter(Boolean).join(" → ")],
            ["Purpose", p.purpose],
            ["Left HQ", p.departureTime ? `${formatDate(event.occurredAt)} ${p.departureTime}` : undefined],
            ["Returned", p.returnTime && p.returnDate ? `${formatDate(p.returnDate)} ${p.returnTime}` : undefined],
            ["Beyond 8 km", p.beyond8Km == null ? undefined : p.beyond8Km ? "Yes" : "No"],
            ["Daily rate", money(p.dailyRate ?? p.taBaseAmount)],
            ["Claim", p.claimPercent != null ? `${p.claimPercent}%` : undefined],
            ["Amount", money(p.amount)],
          ]
        : event.eventType === WorkEventType.LEAVE_RECORDED
          ? [
              ["Days charged", p.days != null ? String(p.days) : undefined],
              [
                "Not counted",
                p.excludedDays?.length
                  ? p.excludedDays.map((d) => formatDate(d)).join(", ")
                  : undefined,
              ],
            ]
          : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/timeline"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Timeline
      </Link>
      <div className={cn("rounded-xl p-4", domainCardClass(event.domain))}>
        <p className={cn("text-sm font-medium", domainLabelClass(event.domain))}>
          {DOMAIN_LABELS[event.domain]}
        </p>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(event.occurredAt)}
        </p>
        {isClaim && status && (
          <div className="mt-2">{claimStatusBadge(status)}</div>
        )}
      </div>

      {detailRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRows rows={detailRows} />
            {p.slabs && p.slabs.length > 0 && (
              <ul className="text-xs text-muted-foreground">
                {p.slabs.map((d) => (
                  <li key={d.date}>
                    {formatDate(d.date)}: {d.hours} h away → {d.percent}%
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {event.remarks && (
        <Card>
          <CardContent className="p-4 text-sm">{event.remarks}</CardContent>
        </Card>
      )}

      {monthlySettlement && status && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 text-sm">
            <p className="text-muted-foreground">
              Billed monthly in {monthlySettlement.title}.
            </p>
            <Link
              href={`/claims/${monthlySettlement.id}`}
              className="font-medium text-primary hover:underline"
            >
              View monthly claim →
            </Link>
          </CardContent>
        </Card>
      )}

      {event.ledgerEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {event.ledgerEntries.map((le) => (
              <p key={le.id}>
                {LEDGER_ACCOUNT_LABELS[le.account] ?? le.account}:{" "}
                {Number(le.amount) > 0 ? "+" : ""}
                {Number(le.amount)} day{Math.abs(Number(le.amount)) === 1 ? "" : "s"}
                {le.expiresAt && ` (valid till ${formatDate(le.expiresAt)})`}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {event.childEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {event.childEvents.map((c) => (
              <p key={c.id}>{c.title}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {editLock && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          {editLock}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {editLock === null && (
          <Link
            href={`/timeline/${event.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Pencil className="h-4 w-4" />
            Edit entry
          </Link>
        )}
        <DeleteEventButton eventId={event.id} redirectTo="/timeline" />
      </div>
    </div>
  );
}
