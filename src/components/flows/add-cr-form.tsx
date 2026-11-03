"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { DatePicker } from "@/components/ui/date-picker";
import { formatLocalDateValue, parseLocalDateValue } from "@/lib/date-values";
import { recordHolidayWork } from "@/actions/events";
import { toastResult } from "@/lib/action-toast";

type AddCrFormProps = {
  /** `yyyy-MM-dd` → holiday name */
  holidays: Record<string, string>;
  expiryDays: number;
  /** Pre-fills the form to replace an existing entry. */
  edit?: {
    eventId: string;
    workDate: string;
    amount: number;
    restDay: boolean;
    remarks: string | null;
  };
};

export function AddCrForm({ holidays, expiryDays, edit }: AddCrFormProps) {
  const router = useRouter();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [workDate, setWorkDate] = useState(
    edit?.workDate ?? formatLocalDateValue(yesterday),
  );
  const [restDay, setRestDay] = useState(edit?.restDay ?? false);

  const parsed = parseLocalDateValue(workDate);
  const isFuture = parsed != null && parsed > new Date();
  const dayKind = !parsed
    ? null
    : parsed.getDay() === 0
      ? "Sunday"
      : holidays[workDate]
        ? `Holiday — ${holidays[workDate]}`
        : null;

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{edit ? "Edit CR" : "Add CR"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Record work on a Sunday, holiday or your rostered rest day to earn
          compensatory rest.
        </p>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            const result = await recordHolidayWork(fd);
            if (!toastResult(result, edit ? "CR updated" : "CR recorded")) return;
            router.push(edit ? `/timeline/${result.data?.id}` : "/records/cr");
          }}
          className="space-y-4"
        >
          {edit && <input type="hidden" name="replacesEventId" value={edit.eventId} />}
          <div>
            <Label>Work date</Label>
            <DatePicker
              name="workDate"
              required
              value={workDate}
              onValueChange={setWorkDate}
            />
            {parsed && (
              <p
                className={`mt-1 text-xs ${dayKind || restDay ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"}`}
              >
                {isFuture
                  ? "CR can only be recorded after the work is done."
                  : dayKind
                    ? `${dayKind} — eligible for CR.`
                    : "Not a Sunday or a saved holiday."}
              </p>
            )}
          </div>
          {parsed && !dayKind && (
            <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
              <input
                type="checkbox"
                name="restDayConfirmed"
                checked={restDay}
                onChange={(e) => setRestDay(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                This was my rostered weekly rest day
                <span className="block text-xs text-muted-foreground">
                  If it was a holiday,{" "}
                  <Link href="/settings/holidays" className="text-primary underline">
                    add it to your holiday calendar
                  </Link>{" "}
                  instead.
                </span>
              </span>
            </label>
          )}
          <div>
            <Label htmlFor="cr-amount">CR earned</Label>
            <Select id="cr-amount" name="amount" defaultValue={String(edit?.amount ?? 1)}>
              <option value="1">Full day (1 CR)</option>
              <option value="0.5">Half day (0.5 CR)</option>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Valid for {expiryDays} days (change in Settings to match your
              office&apos;s orders).
            </p>
          </div>
          <div>
            <Label htmlFor="cr-remarks">Remarks</Label>
            <Textarea
              id="cr-remarks"
              name="remarks"
              rows={2}
              placeholder="Work done, ordered by"
              defaultValue={edit?.remarks ?? undefined}
            />
          </div>
          <SubmitButton
            className="w-full"
            pendingLabel={edit ? "Saving…" : "Recording…"}
            disabled={!parsed || isFuture || (!dayKind && !restDay)}
          >
            {edit ? "Save changes" : "Record"}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
