"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { recordNightDuty } from "@/actions/events";
import { AllowancePreview } from "@/components/flows/allowance-preview";
import { toast } from "sonner";

type NightDutyFormProps = {
  basicPay: number;
  daPercent: number;
};

export function NightDutyForm({ basicPay, daPercent }: NightDutyFormProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Record Night Duty</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            try {
              const result = await recordNightDuty(fd);
              const count = result?.count ?? 1;
              toast.success(
                count === 1
                  ? "Night duty recorded"
                  : `${count} night duties recorded`,
              );
              router.push("/home");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label>Date range</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Pick one night or a from–to range. Leave as a single date for one
              night.
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
          <AllowancePreview
            basicPay={basicPay}
            daPercent={daPercent}
            startDate={startDate}
            endDate={endDate || startDate}
          />
          <div>
            <Label>Remarks</Label>
            <Textarea name="remarks" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Record
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
