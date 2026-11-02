"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updatePaySettings } from "@/actions/events";
import { toastResult } from "@/lib/action-toast";
import {
  calculateNda,
  dailyAllowanceRate,
  NDA_BASIC_PAY_CEILING,
  NDA_MAX_PAY_LEVEL,
} from "@/lib/calculations/allowances";
import { formatCurrency, formatCurrencyExact } from "@/lib/utils";

type PaySettingsFormProps = {
  basicPay: number;
  payLevel: number | null;
  daPercentOverride: number | null;
  officialDaPercent: number | null;
  taRateOverride: number | null;
  crExpiryDays: number;
  clEntitlement: number;
  autoLeaveCredits: boolean;
};

export function PaySettingsForm(props: PaySettingsFormProps) {
  const router = useRouter();
  const [basicPayInput, setBasicPayInput] = useState(
    props.basicPay > 0 ? String(props.basicPay) : "",
  );
  const [payLevelInput, setPayLevelInput] = useState(
    props.payLevel != null ? String(props.payLevel) : "",
  );
  const [daOverrideInput, setDaOverrideInput] = useState(
    props.daPercentOverride != null ? String(props.daPercentOverride) : "",
  );

  const daPercent =
    daOverrideInput.trim() !== ""
      ? parseFloat(daOverrideInput)
      : (props.officialDaPercent ?? 0);

  const derived = useMemo(() => {
    const bp = parseFloat(basicPayInput);
    const level = parseInt(payLevelInput, 10);
    if (!Number.isFinite(daPercent)) return null;
    return {
      nda: Number.isFinite(bp) && bp > 0 ? calculateNda(bp, daPercent) : null,
      taRate: Number.isFinite(level) ? dailyAllowanceRate(level, daPercent) : null,
      level: Number.isFinite(level) ? level : null,
      cappedBasic: Number.isFinite(bp) && bp > NDA_BASIC_PAY_CEILING,
    };
  }, [basicPayInput, payLevelInput, daPercent]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pay & allowances</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            const result = await updatePaySettings(fd);
            if (toastResult(result, "Settings saved")) router.refresh();
          }}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="payLevel">Pay level (7th CPC)</Label>
              <Input
                id="payLevel"
                name="payLevel"
                type="number"
                inputMode="numeric"
                min={1}
                max={18}
                step={1}
                required
                value={payLevelInput}
                onChange={(e) => setPayLevelInput(e.target.value)}
                placeholder="e.g. 6"
              />
            </div>
            <div>
              <Label htmlFor="basicPay">Basic pay (₹ / month)</Label>
              <Input
                id="basicPay"
                name="basicPay"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                required
                value={basicPayInput}
                onChange={(e) => setBasicPayInput(e.target.value)}
                placeholder="e.g. 35400"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="daPercentOverride">Dearness allowance (%)</Label>
            <Input
              id="daPercentOverride"
              name="daPercentOverride"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={daOverrideInput}
              onChange={(e) => setDaOverrideInput(e.target.value)}
              placeholder={
                props.officialDaPercent != null
                  ? `Official: ${props.officialDaPercent}%`
                  : "Official rate"
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank to use the official DA rate for each duty date
              {props.officialDaPercent != null &&
                ` (currently ${props.officialDaPercent}%)`}
              . Fill in only if a new DA order is not in the app yet.
            </p>
          </div>

          {derived && (derived.nda || derived.taRate) && (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {derived.nda && (
                <p>
                  NDA hourly rate {formatCurrencyExact(derived.nda.hourlyRate)} → a
                  full 22:00–06:00 night pays{" "}
                  {formatCurrencyExact(derived.nda.amount)}
                  {derived.cappedBasic &&
                    ` (basic capped at ${formatCurrency(NDA_BASIC_PAY_CEILING)})`}
                  {derived.level != null &&
                    derived.level > NDA_MAX_PAY_LEVEL &&
                    ` — note: NDA is only for Pay Level ${NDA_MAX_PAY_LEVEL} and below`}
                </p>
              )}
              {derived.taRate && (
                <p>Daily allowance on tour: {formatCurrency(derived.taRate)}/day</p>
              )}
            </div>
          )}

          <details className="rounded-xl border border-border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Advanced</summary>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="taRateOverride">Daily allowance override (₹/day)</Label>
                <Input
                  id="taRateOverride"
                  name="taRateOverride"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={props.taRateOverride ?? ""}
                  placeholder={derived?.taRate ? `Auto: ${derived.taRate}` : "Auto"}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave blank to use the 7th CPC rate for your pay level.
                </p>
              </div>
              <div>
                <Label htmlFor="crExpiryDays">CR valid for (days)</Label>
                <Input
                  id="crExpiryDays"
                  name="crExpiryDays"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={props.crExpiryDays}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Applies to CR recorded from now on. Use the limit set by your
                  office&apos;s orders.
                </p>
              </div>
              <div>
                <Label htmlFor="clEntitlement">Casual leave per year (days)</Label>
                <Input
                  id="clEntitlement"
                  name="clEntitlement"
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  defaultValue={props.clEntitlement}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  8 for staff entitled to all public holidays, 10 for others.
                </p>
              </div>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="autoLeaveCredits"
                  defaultChecked={props.autoLeaveCredits}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>
                  Credit leave automatically
                  <span className="block text-xs text-muted-foreground">
                    Resets CL each 1 Jan and adds 15 LAP + 10 LHAP each 1 Jan and
                    1 Jul (LAP capped at 300).
                  </span>
                </span>
              </label>
            </div>
          </details>

          <SubmitButton>Save</SubmitButton>
        </form>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <Link href="/settings/holidays" className="text-primary hover:underline">
            Manage holiday calendar →
          </Link>
          <Link href="/profile" className="text-primary hover:underline">
            Edit profile →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
