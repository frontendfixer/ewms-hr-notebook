"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
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
};

export function NightDutyForm({
  basicPay,
  payLevel,
  daPercentOverride,
}: NightDutyFormProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState(DEFAULT_NIGHT_DUTY_START);
  const [endTime, setEndTime] = useState(DEFAULT_NIGHT_DUTY_END);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Record Night Duty</CardTitle>
        <p className="text-sm text-muted-foreground">
          NDA is paid for duty performed between 22:00 and 06:00.
        </p>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            const result = await recordNightDuty(fd);
            const count = result.ok ? (result.data?.count ?? 1) : 0;
            if (
              toastResult(
                result,
                count === 1 ? "Night duty recorded" : `${count} night duties recorded`,
              )
            ) {
              router.push("/records/night");
            }
          }}
          className="space-y-4"
        >
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
            />
          </div>
          <SubmitButton className="w-full" pendingLabel="Recording…" disabled={basicPay <= 0 || !startDate}>
            Record
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
