"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { recordTravel } from "@/actions/events";
import { TaAllowancePreview } from "@/components/flows/ta-allowance-preview";
import { toast } from "sonner";

type TravelFormProps = {
  taBaseAmount: number;
};

export function TravelForm({ taBaseAmount }: TravelFormProps) {
  const router = useRouter();
  const [claimPercent, setClaimPercent] = useState("100");

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Record Travel</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            try {
              await recordTravel(fd);
              toast.success("Travel recorded");
              router.push("/home");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label>Journey date</Label>
            <DatePicker name="journeyDate" required placeholder="Pick journey date" />
          </div>
          <div>
            <Label>To (destination)</Label>
            <Input name="to" required placeholder="e.g. KGP" />
          </div>
          <div>
            <Label>From</Label>
            <Input name="from" />
          </div>
          <div>
            <Label>Purpose</Label>
            <Input name="purpose" placeholder="Inspection, training..." />
          </div>
          <div>
            <Label>TA claim (%)</Label>
            <Input
              name="claimPercent"
              type="number"
              min={1}
              max={100}
              step={1}
              required
              value={claimPercent}
              onChange={(e) => setClaimPercent(e.target.value)}
              placeholder="100"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              100% = full TA. Use 70, 30, etc. when claiming less.
            </p>
          </div>
          <TaAllowancePreview
            taBaseAmount={taBaseAmount}
            claimPercent={parseFloat(claimPercent) || 0}
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
