"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { recordNightDuty } from "@/actions/events";
import { AllowancePreview } from "@/components/flows/allowance-preview";
import { toastResult } from "@/lib/action-toast";
import {
  DEFAULT_NIGHT_DUTY_END,
  DEFAULT_NIGHT_DUTY_START,
} from "@/lib/calculations/allowances";

type NightDutyFormProps = {
  basicPay: number;
  payLevel: number | null;
  daPercentOverride: number | null;
  /** Pre-fills the form to replace one recorded night. */
  edit?: {
    eventId: string;
    date: string;
    startTime: string;
    endTime: string;
    remarks: string | null;
  };
};

export function NightDutyForm({
  basicPay,
  payLevel,
  daPercentOverride,
  edit,
}: NightDutyFormProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(edit?.date ?? "");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState(edit?.startTime ?? DEFAULT_NIGHT_DUTY_START);
  const [endTime, setEndTime] = useState(edit?.endTime ?? DEFAULT_NIGHT_DUTY_END);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{edit ? "Edit Night Duty" : "Record Night Duty"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          NDA is paid for duty performed between 22:00 and 06:00.
        </p>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            const result = await recordNightDuty(fd);
            const count = result.ok ? (result.data?.count ?? 1) : 0;
            const message = edit
              ? "Night duty updated"
              : count === 1
                ? "Night duty recorded"
                : `${count} night duties recorded`;
            if (!toastResult(result, message)) return;
            router.push(edit ? `/timeline/${result.data?.id}` : "/timeline?filter=NIGHT_DUTY");
          }}
          className="space-y-4"
        >
          {edit && <input type="hidden" name="replacesEventId" value={edit.eventId} />}
          {edit ? (
            <div>
              <Label>Duty date</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                The date the duty started.
              </p>
              <DatePicker
                name="startDate"
                required
                value={startDate}
                onValueChange={setStartDate}
              />
            </div>
          ) : (
            <div>
              <Label>Duty date(s)</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                The date the duty started. Pick a from–to range for several
                nights with the same timings.
              </p>
              <DateRangePicker
                startName="startDate"
                endName="endDate"
                required
                optionalEnd
                closeOnSelect={false}
                placeholder="Pick night duty dates"
                onRangeChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nd-start">On duty</Label>
              <Input
                id="nd-start"
                name="startTime"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nd-end">Off duty</Label>
              <Input
                id="nd-end"
                name="endTime"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <AllowancePreview
            basicPay={basicPay}
            payLevel={payLevel}
            daPercentOverride={daPercentOverride}
            startDate={startDate}
            endDate={endDate || startDate}
            startTime={startTime}
            endTime={endTime}
          />
          <div>
            <Label htmlFor="nd-remarks">Remarks</Label>
            <Textarea
              id="nd-remarks"
              name="remarks"
              rows={2}
              placeholder="e.g. Shift, roster no., certifying officer"
              defaultValue={edit?.remarks ?? undefined}
            />
          </div>
          <SubmitButton
            className="w-full"
            pendingLabel={edit ? "Saving…" : "Recording…"}
            disabled={basicPay <= 0 || !startDate}
          >
            {edit ? "Save changes" : "Record"}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
