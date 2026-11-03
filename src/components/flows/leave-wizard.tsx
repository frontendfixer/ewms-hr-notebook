"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { recordLeave } from "@/actions/events";
import { toastResult } from "@/lib/action-toast";
import { useMemo, useState } from "react";
import type { LeaveType } from "@/generated/prisma/client";
import {
  BALANCE_DEDUCTING_LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPE_SHORT_LABELS,
  LEAVE_TYPES_FORM,
} from "@/lib/leave-types";
import {
  allocateCrCredits,
  countLeaveDays,
  HOLIDAY_EXCLUDING_LEAVE,
  type LeaveDurationValue,
} from "@/lib/calculations/leave";
import { parseLocalDateValue } from "@/lib/date-values";
import { cn, formatDate, formatShortDate } from "@/lib/utils";

type CrCredit = {
  creditEventId: string;
  balance: number;
  expiresAt: string | null;
  earnedAt: string | null;
};

export type LeaveSelection = "USE_CR" | LeaveType;

type LeaveBalances = Partial<Record<LeaveType, number>>;

const USE_CR_LABEL = "Use CR (Compensatory Rest)";

/** Server dates are UTC midnight; compare them as local calendar dates. */
function calendarDate(iso: string | null): Date | null {
  return iso ? (parseLocalDateValue(iso.slice(0, 10)) ?? null) : null;
}

export function LeaveWizard({
  credits,
  balances,
  holidays,
  edit,
}: {
  credits: CrCredit[];
  balances: LeaveBalances;
  /** `yyyy-MM-dd` keys of saved holidays. */
  holidays: string[];
  /**
   * Pre-fills the form to replace an existing leave. `credits` and `balances`
   * should then already include what that leave used.
   */
  edit?: {
    eventId: string;
    selection: LeaveSelection;
    startDate: string;
    endDate: string;
    duration: LeaveDurationValue;
    reason: string | null;
    crCreditEventIds: string[];
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const initialSelection: LeaveSelection =
    edit?.selection ??
    (params.get("mode") === "cr" || params.get("usesCr") === "1"
      ? "USE_CR"
      : "CL");
  const preCr = params.get("cr");

  const [selection, setSelection] = useState<LeaveSelection>(initialSelection);
  const [startDate, setStartDate] = useState(edit?.startDate ?? "");
  const [endDate, setEndDate] = useState(edit?.endDate ?? "");
  const [duration, setDuration] = useState<LeaveDurationValue>(edit?.duration ?? "FULL");
  const [preferred, setPreferred] = useState<string[]>(
    edit?.crCreditEventIds ?? (preCr ? [preCr] : []),
  );
  const usesCr = selection === "USE_CR";
  const leaveType: LeaveType = usesCr ? "SPECIAL_CL" : selection;

  const start = parseLocalDateValue(startDate);
  const end = parseLocalDateValue(endDate) ?? start;
  const singleDay = !start || !end || start.getTime() === end.getTime();
  const effectiveDuration: LeaveDurationValue = singleDay ? duration : "FULL";

  const count = useMemo(() => {
    if (!start || !end || end < start) return null;
    return countLeaveDays(start, end, effectiveDuration, {
      excludeHolidays: HOLIDAY_EXCLUDING_LEAVE.has(usesCr ? "CR" : selection),
      holidayKeys: new Set(holidays),
    });
  }, [start, end, effectiveDuration, usesCr, selection, holidays]);

  const crPlan = useMemo(() => {
    if (!usesCr || !count || !start) return null;
    return allocateCrCredits(
      credits.map((c) => ({
        ...c,
        expiresAt: calendarDate(c.expiresAt),
        earnedAt: calendarDate(c.earnedAt),
      })),
      count.days,
      start,
      preferred,
    );
  }, [usesCr, count, start, credits, preferred]);

  const deducts = !usesCr && BALANCE_DEDUCTING_LEAVE_TYPES.includes(selection);
  const available = deducts ? (balances[selection as LeaveType] ?? 0) : null;
  const insufficient =
    (available != null && count != null && count.days > available) ||
    (crPlan != null && crPlan.shortfall > 0);
  const totalCr = credits.reduce((s, c) => s + c.balance, 0);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{edit ? "Edit Leave" : "Take Leave"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            const result = await recordLeave(fd);
            if (!toastResult(result, edit ? "Leave updated" : "Leave recorded")) return;
            router.push(edit ? `/timeline/${result.data?.id}` : "/records/leave");
          }}
          className="space-y-4"
        >
          {edit && <input type="hidden" name="replacesEventId" value={edit.eventId} />}
          <input type="hidden" name="leaveType" value={leaveType} />
          <input type="hidden" name="usesCr" value={usesCr ? "true" : "false"} />
          <input type="hidden" name="duration" value={effectiveDuration} />
          {usesCr &&
            crPlan?.allocations.map((a) => (
              <input
                key={a.creditEventId}
                type="hidden"
                name="crCreditEventIds"
                value={a.creditEventId}
              />
            ))}

          <fieldset>
            <legend className="text-sm font-medium leading-none">Leave type</legend>
            <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors",
                  usesCr && "bg-primary/5",
                )}
              >
                <span className="font-medium">{USE_CR_LABEL}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{totalCr} avail.</span>
                  <input
                    type="radio"
                    name="leaveSelection"
                    checked={usesCr}
                    onChange={() => setSelection("USE_CR")}
                    className="h-4 w-4 accent-primary"
                  />
                </span>
              </label>
              {LEAVE_TYPES_FORM.map((type) => (
                <label
                  key={type}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors",
                    selection === type && "bg-primary/5",
                  )}
                >
                  <span>{LEAVE_TYPE_LABELS[type]}</span>
                  <span className="flex items-center gap-3">
                    {BALANCE_DEDUCTING_LEAVE_TYPES.includes(type) && (
                      <span className="text-xs text-muted-foreground">
                        {balances[type] ?? 0} avail.
                      </span>
                    )}
                    <input
                      type="radio"
                      name="leaveSelection"
                      checked={selection === type}
                      onChange={() => setSelection(type)}
                      className="h-4 w-4 accent-primary"
                    />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <Label>Leave dates</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Select from and to on the calendar. Tap the same day twice for a
              single day.
            </p>
            <DateRangePicker
              startName="startDate"
              endName="endDate"
              required
              placeholder="Pick leave dates"
              defaultStart={edit?.startDate}
              defaultEnd={edit?.endDate}
              closeOnSelect={false}
              onRangeChange={(s, e) => {
                setStartDate(s);
                setEndDate(e);
              }}
            />
          </div>

          <div>
            <Label htmlFor="leave-duration">Duration</Label>
            <Select
              id="leave-duration"
              value={effectiveDuration}
              disabled={!singleDay}
              onChange={(e) => setDuration(e.target.value as LeaveDurationValue)}
            >
              <option value="FULL">Full day</option>
              <option value="FIRST_HALF">First half</option>
              <option value="SECOND_HALF">Second half</option>
            </Select>
            {!singleDay && (
              <p className="mt-1 text-xs text-muted-foreground">
                Half-day is only for a single date.
              </p>
            )}
          </div>

          {count && (
            <div
              className={cn(
                "rounded-xl border p-3 text-sm",
                insufficient
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border bg-muted/40",
              )}
              aria-live="polite"
            >
              <p className="font-medium">
                {count.days} day{count.days === 1 ? "" : "s"} of{" "}
                {usesCr ? "CR" : LEAVE_TYPE_SHORT_LABELS[selection as LeaveType]}
              </p>
              {count.excludedDays.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Not counted (Sunday/holiday):{" "}
                  {count.excludedDays
                    .map((d) => formatShortDate(parseLocalDateValue(d) ?? d))
                    .join(", ")}
                </p>
              )}
              {available != null && (
                <p className="text-xs text-muted-foreground">
                  Balance {available} → {available - count.days}
                  {count.days > available && " — not enough balance"}
                </p>
              )}
              {!deducts && !usesCr && (
                <p className="text-xs text-muted-foreground">
                  Does not deduct from your leave balance.
                </p>
              )}
            </div>
          )}

          {usesCr && credits.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">CR credits (oldest expiry used first)</p>
              <p className="text-xs text-muted-foreground">
                Tick a credit to use it first.
              </p>
              {credits.map((c) => {
                const planned = crPlan?.allocations.find(
                  (a) => a.creditEventId === c.creditEventId,
                );
                const expiry = calendarDate(c.expiresAt);
                const expired = start && expiry ? expiry <= start : false;
                return (
                  <label
                    key={c.creditEventId}
                    className={cn(
                      "mt-2 flex items-center gap-2 text-sm",
                      expired && "opacity-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={preferred.includes(c.creditEventId)}
                      disabled={expired}
                      onChange={(e) =>
                        setPreferred((prev) =>
                          e.target.checked
                            ? [...prev, c.creditEventId]
                            : prev.filter((id) => id !== c.creditEventId),
                        )
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="flex-1">
                      {c.balance} day — worked{" "}
                      {c.earnedAt ? formatDate(c.earnedAt) : "—"}
                      {c.expiresAt && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          · {expired ? "expired by leave date" : `valid till ${formatDate(c.expiresAt)}`}
                        </span>
                      )}
                    </span>
                    {planned && (
                      <span className="text-xs font-medium text-primary">
                        uses {planned.amount}
                      </span>
                    )}
                  </label>
                );
              })}
              {crPlan && crPlan.shortfall > 0 && (
                <p className="mt-2 text-xs text-destructive">
                  {crPlan.shortfall} more CR day(s) needed for these dates.
                </p>
              )}
            </div>
          )}

          {usesCr && credits.length === 0 && (
            <p className="rounded-xl border border-amber-300 bg-amber-50/50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              No CR credits available. Add CR from holiday work first.
            </p>
          )}

          <div>
            <Label htmlFor="leave-reason">Reason</Label>
            <Textarea
              id="leave-reason"
              name="reason"
              rows={2}
              defaultValue={edit?.reason ?? undefined}
            />
          </div>
          <SubmitButton
            className="w-full"
            pendingLabel={edit ? "Saving…" : "Submitting…"}
            disabled={!count || count.days === 0 || insufficient || (usesCr && credits.length === 0)}
          >
            {edit ? "Save changes" : "Submit Leave"}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
