"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { recordLeave } from "@/actions/events";
import { toast } from "sonner";
import { useState } from "react";
import { LEAVE_TYPE_LABELS, LEAVE_TYPES_ORDERED } from "@/lib/leave-types";

type CrCredit = {
  creditEventId: string;
  balance: number;
  expiresAt: string | null;
  earnedAt: string | null;
};

export function LeaveWizard({ credits }: { credits: CrCredit[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [usesCr, setUsesCr] = useState(params.get("usesCr") === "1");
  const preCr = params.get("cr") ?? credits[0]?.creditEventId;

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Take Leave</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            try {
              await recordLeave(fd);
              toast.success("Leave recorded");
              router.push("/home");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label>Leave type</Label>
            <Select name="leaveType" required defaultValue="SPECIAL_CL">
              {LEAVE_TYPES_ORDERED.map((k) => (
                <option key={k} value={k}>
                  {LEAVE_TYPE_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
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
              closeOnSelect={false}
            />
          </div>
          <div>
            <Label>Duration</Label>
            <Select name="duration" defaultValue="FULL">
              <option value="FULL">Full day</option>
              <option value="FIRST_HALF">First half</option>
              <option value="SECOND_HALF">Second half</option>
            </Select>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea name="reason" rows={2} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={usesCr}
              onChange={(e) => setUsesCr(e.target.checked)}
            />
            Use CR?
            <input type="hidden" name="usesCr" value={usesCr ? "true" : "false"} />
          </label>
          {usesCr && credits.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">Recommended (FIFO)</p>
              {credits.map((c) => (
                <label key={c.creditEventId} className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="crCreditEventIds"
                    value={c.creditEventId}
                    defaultChecked={c.creditEventId === preCr}
                  />
                  {c.balance} day — expires{" "}
                  {c.expiresAt
                    ? new Date(c.expiresAt).toLocaleDateString("en-IN")
                    : "—"}
                </label>
              ))}
            </div>
          )}
          <Button type="submit" className="w-full">
            Submit Leave
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
