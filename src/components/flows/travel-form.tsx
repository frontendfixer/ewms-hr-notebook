"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { DatePicker } from "@/components/ui/date-picker";
import { recordTravel } from "@/actions/events";
import { TaAllowancePreview } from "@/components/flows/ta-allowance-preview";
import { toastResult } from "@/lib/action-toast";
import { parseLocalDateValue } from "@/lib/date-values";
import {
  parseTimeToMinutes,
  taRateFor,
  tourDaySlabs,
} from "@/lib/calculations/allowances";

type TravelFormProps = {
  payLevel: number | null;
  daPercentOverride: number | null;
  taRateOverride: number | null;
  /** Pre-fills the form to replace an existing journey. */
  edit?: {
    eventId: string;
    journeyDate: string;
    /** Empty when the return was on the journey date. */
    returnDate: string;
    departureTime: string;
    returnTime: string;
    from: string;
    to: string;
    purpose: string;
    beyond8Km: boolean;
    /** Set when the claim % was entered by hand. */
    manualPercent: number | null;
    remarks: string | null;
  };
};

export function TravelForm({
  payLevel,
  daPercentOverride,
  taRateOverride,
  edit,
}: TravelFormProps) {
  const router = useRouter();
  const [journeyDate, setJourneyDate] = useState(edit?.journeyDate ?? "");
  const [returnDate, setReturnDate] = useState(edit?.returnDate ?? "");
  const [departureTime, setDepartureTime] = useState(edit?.departureTime ?? "");
  const [returnTime, setReturnTime] = useState(edit?.returnTime ?? "");
  const [beyond8Km, setBeyond8Km] = useState(edit?.beyond8Km ?? true);
  const [manual, setManual] = useState(edit?.manualPercent != null);
  const [claimPercent, setClaimPercent] = useState(
    String(edit?.manualPercent ?? 100),
  );

  const rateKnown = payLevel != null || taRateOverride != null;

  const computed = useMemo(() => {
    const day = parseLocalDateValue(journeyDate);
    const back = parseLocalDateValue(returnDate) ?? day;
    const dep = parseTimeToMinutes(departureTime);
    const ret = parseTimeToMinutes(returnTime);
    if (!day || !back || dep == null || ret == null) return null;
    const departure = new Date(day.getTime() + dep * 60_000);
    const arrival = new Date(back.getTime() + ret * 60_000);
    if (!(arrival > departure)) return { error: "Return must be after departure" } as const;
    const slabs = tourDaySlabs(departure, arrival);
    return { slabs, percent: slabs.reduce((s, d) => s + d.percent, 0) } as const;
  }, [journeyDate, returnDate, departureTime, returnTime]);

  const dailyRate = taRateFor(
    { payLevel, taRateOverride, daPercentOverride },
    parseLocalDateValue(journeyDate) ?? new Date(),
  );
  const percent = manual
    ? parseFloat(claimPercent) || 0
    : computed && "percent" in computed
      ? beyond8Km
        ? computed.percent
        : 0
      : null;

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{edit ? "Edit Travel" : "Record Travel"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Daily allowance is worked out from the time you were away from
          headquarters.
        </p>
      </CardHeader>
      <CardContent>
        {!rateKnown && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Set your{" "}
            <Link href="/settings" className="font-medium underline">
              Pay Level in Settings
            </Link>{" "}
            so the daily allowance rate can be worked out.
          </p>
        )}
        <form
          action={async (fd) => {
            const result = await recordTravel(fd);
            if (!toastResult(result, edit ? "Travel updated" : "Travel recorded")) return;
            router.push(edit ? `/timeline/${result.data?.id}` : "/timeline?filter=TRAVEL");
          }}
          className="space-y-4"
        >
          {edit && <input type="hidden" name="replacesEventId" value={edit.eventId} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ta-from">From</Label>
              <Input
                id="ta-from"
                name="from"
                placeholder="e.g. HWH (HQ)"
                defaultValue={edit?.from}
              />
            </div>
            <div>
              <Label htmlFor="ta-to">To (destination)</Label>
              <Input
                id="ta-to"
                name="to"
                required
                placeholder="e.g. KGP"
                defaultValue={edit?.to}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Left HQ on</Label>
              <DatePicker
                name="journeyDate"
                required
                placeholder="Date"
                defaultValue={edit?.journeyDate}
                onValueChange={setJourneyDate}
              />
            </div>
            <div>
              <Label htmlFor="ta-dep">at</Label>
              <Input
                id="ta-dep"
                name="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
            </div>
            <div>
              <Label>Returned on</Label>
              <DatePicker
                name="returnDate"
                placeholder="Same day"
                defaultValue={edit?.returnDate}
                onValueChange={setReturnDate}
              />
            </div>
            <div>
              <Label htmlFor="ta-ret">at</Label>
              <Input
                id="ta-ret"
                name="returnTime"
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
              />
            </div>
          </div>
          {computed && "error" in computed && (
            <p className="text-xs text-destructive">{computed.error}</p>
          )}
          <div>
            <Label htmlFor="ta-purpose">Purpose</Label>
            <Input
              id="ta-purpose"
              name="purpose"
              placeholder="Inspection, training..."
              defaultValue={edit?.purpose}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="beyond8Km"
              checked={beyond8Km}
              onChange={(e) => setBeyond8Km(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Duty place is more than 8 km from headquarters
          </label>
          <div className="rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="manualPercent"
                checked={manual}
                onChange={(e) => setManual(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Enter claim % myself
            </label>
            {manual && (
              <div className="mt-3">
                <Label htmlFor="ta-percent">Claim (%)</Label>
                <Input
                  id="ta-percent"
                  name="claimPercent"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={claimPercent}
                  onChange={(e) => setClaimPercent(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Per calendar day: up to 6 h away = 30%, 6–12 h = 70%, over 12 h =
                  100%. Add the days (e.g. 170 for a full day + 70%).
                </p>
              </div>
            )}
          </div>
          {percent != null && rateKnown ? (
            <TaAllowancePreview
              dailyRate={dailyRate}
              claimPercent={percent}
              slabs={(computed && "slabs" in computed && computed.slabs) || []}
              manual={manual}
              beyond8Km={beyond8Km}
              payLevel={payLevel}
              usingOverride={taRateOverride != null}
            />
          ) : (
            rateKnown && (
              <p className="text-xs text-muted-foreground">
                Enter departure and return times to calculate the allowance, or
                enter the claim % yourself.
              </p>
            )
          )}
          <div>
            <Label htmlFor="ta-remarks">Remarks</Label>
            <Textarea
              id="ta-remarks"
              name="remarks"
              rows={2}
              placeholder="Train no., duty card no."
              defaultValue={edit?.remarks ?? undefined}
            />
          </div>
          <SubmitButton
            className="w-full"
            pendingLabel={edit ? "Saving…" : "Recording…"}
            disabled={!rateKnown || percent == null || !journeyDate}
          >
            {edit ? "Save changes" : "Record"}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
