"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { recordLeave } from "@/actions/events";
import { toast } from "sonner";
import { useState } from "react";
import type { LeaveType } from "@/generated/prisma/client";
import {
  BALANCE_DEDUCTING_LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPES_FORM,
} from "@/lib/leave-types";
import { cn } from "@/lib/utils";

type CrCredit = {
  creditEventId: string;
  balance: number;
  expiresAt: string | null;
  earnedAt: string | null;
};

type LeaveSelection = "USE_CR" | LeaveType;

const USE_CR_LABEL = "Use CR (Compensatory Rest)";

export function LeaveWizard({ credits }: { credits: CrCredit[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const initialSelection: LeaveSelection =
    params.get("mode") === "cr" || params.get("usesCr") === "1"
      ? "USE_CR"
      : "CL";
  const preCr = params.get("cr") ?? credits[0]?.creditEventId;

  const [selection, setSelection] = useState<LeaveSelection>(initialSelection);
  const usesCr = selection === "USE_CR";
  const leaveType: LeaveType = usesCr ? "SPECIAL_CL" : selection;

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
          <input type="hidden" name="leaveType" value={leaveType} />
          <input type="hidden" name="usesCr" value={usesCr ? "true" : "false"} />

          <div>
            <Label>Leave type</Label>
            <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors",
                  usesCr && "bg-primary/5",
                )}
              >
                <span className="font-medium">{USE_CR_LABEL}</span>
                <input
                  type="radio"
                  name="leaveSelection"
                  checked={usesCr}
                  onChange={() => setSelection("USE_CR")}
                  className="h-4 w-4 accent-primary"
                />
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
                  <input
                    type="radio"
                    name="leaveSelection"
                    checked={selection === type}
                    onChange={() => setSelection(type)}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>
            {usesCr ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Deducts from your CR balance, not your leave balance.
              </p>
            ) : BALANCE_DEDUCTING_LEAVE_TYPES.includes(selection) ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Deducts from your {LEAVE_TYPE_LABELS[selection]} balance.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Does not deduct from your leave balance.
              </p>
            )}
          </div>

          {usesCr && credits.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">Select CR credits (FIFO)</p>
              {credits.map((c) => (
                <label
                  key={c.creditEventId}
                  className="mt-2 flex items-center gap-2 text-sm"
                >
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

          {usesCr && credits.length === 0 && (
            <p className="rounded-xl border border-amber-300 bg-amber-50/50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              No CR credits available. Add CR from holiday work first.
            </p>
          )}

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
          <Button type="submit" className="w-full" disabled={usesCr && credits.length === 0}>
            Submit Leave
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
