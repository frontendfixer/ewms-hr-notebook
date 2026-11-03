import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { LeaveType, WorkEventType } from "@/generated/prisma/client";
import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { eventService, getCrExpiryDays } from "@/lib/services/event-service";
import { ledgerService } from "@/lib/services/ledger-service";
import { leaveAccrualService } from "@/lib/services/leave-accrual-service";
import { getPaySettings } from "@/lib/pay-settings";
import { leaveDayKey, type LeaveDurationValue } from "@/lib/calculations/leave";
import {
  DEFAULT_NIGHT_DUTY_END,
  DEFAULT_NIGHT_DUTY_START,
} from "@/lib/calculations/allowances";
import { isEditableEventType } from "@/lib/edit-rules";
import { startOfDay } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AddCrForm } from "@/components/flows/add-cr-form";
import { LeaveWizard } from "@/components/flows/leave-wizard";
import { NightDutyForm } from "@/components/flows/night-duty-form";
import { TravelForm } from "@/components/flows/travel-form";

type EditableEvent = Awaited<ReturnType<typeof eventService.getEditTarget>>;

async function CrEdit({ userId, target }: { userId: string; target: EditableEvent }) {
  const { event, credit } = target;
  const p = event.payload as { dayKind?: string };
  const [holidays, expiryDays] = await Promise.all([
    prisma.publicHoliday.findMany({ where: { userId } }),
    getCrExpiryDays(userId),
  ]);
  return (
    <AddCrForm
      holidays={Object.fromEntries(holidays.map((h) => [leaveDayKey(h.date), h.name]))}
      expiryDays={expiryDays}
      edit={{
        eventId: event.id,
        workDate: leaveDayKey(event.occurredAt),
        amount: Number((credit?.payload as { amount?: number } | undefined)?.amount ?? 1),
        restDay: p.dayKind === "REST_DAY",
        remarks: event.remarks,
      }}
    />
  );
}

async function LeaveEdit({ userId, target }: { userId: string; target: EditableEvent }) {
  const { event } = target;
  const p = event.payload as {
    leaveType?: LeaveType;
    startDate?: string;
    endDate?: string;
    duration?: LeaveDurationValue;
    usesCr?: boolean;
  };
  const start = startOfDay(new Date(p.startDate ?? event.occurredAt));
  const end = startOfDay(new Date(p.endDate ?? p.startDate ?? event.occurredAt));
  const today = startOfDay(new Date());

  await leaveAccrualService.ensureAccruals(userId);
  // Leave out this leave's own postings so what it took counts as available.
  // Credits valid on its current start date stay listed; the form greys out
  // any that have expired by a newly picked date.
  const [credits, balances, holidays, consumed] = await Promise.all([
    ledgerService.getAvailableCrCredits(userId, prisma, start < today ? start : today, event.id),
    ledgerService.getBalances(userId, event.id),
    prisma.publicHoliday.findMany({ where: { userId }, select: { date: true } }),
    prisma.workEvent.findMany({
      where: {
        parentEventId: event.id,
        userId,
        eventType: WorkEventType.CR_CONSUMED,
        voidedAt: null,
      },
      select: { payload: true },
    }),
  ]);

  return (
    <Suspense fallback={<p className="p-4">Loading...</p>}>
      <LeaveWizard
        credits={credits.map((c) => ({
          ...c,
          expiresAt: c.expiresAt?.toISOString() ?? null,
          earnedAt: c.earnedAt?.toISOString() ?? null,
        }))}
        balances={{
          CL: balances.LEAVE_CL ?? 0,
          LAP: balances.LEAVE_LAP ?? 0,
          LHAP: balances.LEAVE_LHAP ?? 0,
        }}
        holidays={holidays.map((h) => leaveDayKey(h.date))}
        edit={{
          eventId: event.id,
          selection: p.usesCr ? "USE_CR" : (p.leaveType ?? LeaveType.CL),
          startDate: leaveDayKey(start),
          endDate: leaveDayKey(end),
          duration: p.duration ?? "FULL",
          reason: event.remarks,
          crCreditEventIds: consumed
            .map((c) => (c.payload as { crCreditEventId?: string }).crCreditEventId)
            .filter((id): id is string => id != null),
        }}
      />
    </Suspense>
  );
}

async function NightDutyEdit({ userId, target }: { userId: string; target: EditableEvent }) {
  const { event } = target;
  const p = event.payload as { startTime?: string; endTime?: string };
  const pay = await getPaySettings(userId);
  return (
    <NightDutyForm
      basicPay={pay.basicPay}
      payLevel={pay.payLevel}
      daPercentOverride={pay.daPercentOverride}
      edit={{
        eventId: event.id,
        date: leaveDayKey(event.occurredAt),
        startTime: p.startTime ?? DEFAULT_NIGHT_DUTY_START,
        endTime: p.endTime ?? DEFAULT_NIGHT_DUTY_END,
        remarks: event.remarks,
      }}
    />
  );
}

async function TravelEdit({ userId, target }: { userId: string; target: EditableEvent }) {
  const { event } = target;
  const p = event.payload as {
    returnDate?: string;
    departureTime?: string | null;
    returnTime?: string | null;
    from?: string;
    to?: string;
    purpose?: string;
    beyond8Km?: boolean;
    computedPercent?: number | null;
    claimPercent?: number;
  };
  const pay = await getPaySettings(userId);
  const journeyKey = leaveDayKey(event.occurredAt);
  const returnKey = p.returnDate ? leaveDayKey(new Date(p.returnDate)) : journeyKey;
  // A claim % that differs from the one worked out from the times was typed in.
  const manualPercent =
    p.claimPercent != null &&
    (p.computedPercent == null || p.claimPercent !== p.computedPercent)
      ? p.claimPercent
      : null;
  return (
    <TravelForm
      payLevel={pay.payLevel}
      daPercentOverride={pay.daPercentOverride}
      taRateOverride={pay.taRateOverride}
      edit={{
        eventId: event.id,
        journeyDate: journeyKey,
        returnDate: returnKey === journeyKey ? "" : returnKey,
        departureTime: p.departureTime ?? "",
        returnTime: p.returnTime ?? "",
        from: p.from ?? "",
        to: p.to ?? "",
        purpose: p.purpose ?? "",
        beyond8Km: p.beyond8Km ?? true,
        manualPercent,
        remarks: event.remarks,
      }}
    />
  );
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const userId = await requireUserId();
  const { eventId } = await params;

  const found = await prisma.workEvent.findFirst({
    where: { id: eventId, userId, voidedAt: null },
    select: { eventType: true },
  });
  if (!found) notFound();
  if (!isEditableEventType(found.eventType)) redirect(`/timeline/${eventId}`);

  const target = await eventService.getEditTarget(userId, eventId);

  let form: React.ReactNode = null;
  if (!target.reason) {
    switch (target.event.eventType) {
      case WorkEventType.HOLIDAY_WORK_RECORDED:
        form = <CrEdit userId={userId} target={target} />;
        break;
      case WorkEventType.LEAVE_RECORDED:
        form = <LeaveEdit userId={userId} target={target} />;
        break;
      case WorkEventType.NIGHT_DUTY_RECORDED:
        form = <NightDutyEdit userId={userId} target={target} />;
        break;
      case WorkEventType.TRAVEL_RECORDED:
        form = <TravelEdit userId={userId} target={target} />;
        break;
    }
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-lg">
        <Link
          href={`/timeline/${eventId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to entry
        </Link>
      </div>
      {form ?? (
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p>{target.reason ?? "This entry can't be edited"}</p>
          </CardContent>
        </Card>
      )}
      {form && (
        <p className="mx-auto max-w-lg text-xs text-muted-foreground">
          Saving replaces this entry. The original stays in your history as
          &ldquo;Edited&rdquo;.
          {(target.event.eventType === WorkEventType.NIGHT_DUTY_RECORDED ||
            target.event.eventType === WorkEventType.TRAVEL_RECORDED) &&
            " The amount is worked out again with your current pay settings."}
        </p>
      )}
    </div>
  );
}
