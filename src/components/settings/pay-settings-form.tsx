"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updatePaySettings } from "@/actions/events";
import { dearnessAllowanceFromPercent } from "@/lib/calculations/allowances";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type PaySettingsFormProps = {
  basicPay: number;
  daPercent: number;
  taBaseAmount: number;
  crExpiryDays: number;
};

export function PaySettingsForm({
  basicPay,
  daPercent,
  taBaseAmount,
  crExpiryDays,
}: PaySettingsFormProps) {
  const [basicPayInput, setBasicPayInput] = useState(
    basicPay > 0 ? String(basicPay) : "",
  );
  const [daPercentInput, setDaPercentInput] = useState(
    daPercent > 0 ? String(daPercent) : "",
  );

  const computedDa = useMemo(() => {
    const bp = parseFloat(basicPayInput);
    const pct = parseFloat(daPercentInput);
    if (!Number.isFinite(bp) || !Number.isFinite(pct) || bp <= 0) return null;
    return dearnessAllowanceFromPercent(bp, pct);
  }, [basicPayInput, daPercentInput]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pay & allowances</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            try {
              await updatePaySettings(fd);
              toast.success("Pay settings saved");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to save");
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="basicPay">Basic pay (₹ / month)</Label>
            <Input
              id="basicPay"
              name="basicPay"
              type="number"
              min={0}
              step={1}
              required
              value={basicPayInput}
              onChange={(e) => setBasicPayInput(e.target.value)}
              placeholder="e.g. 56000"
            />
          </div>
          <div>
            <Label htmlFor="daPercent">Dearness allowance (%)</Label>
            <Input
              id="daPercent"
              name="daPercent"
              type="number"
              min={0}
              max={100}
              step={0.01}
              required
              value={daPercentInput}
              onChange={(e) => setDaPercentInput(e.target.value)}
              placeholder="e.g. 54"
            />
            {computedDa != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                DA amount: {formatCurrency(computedDa)} / month
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="taBaseAmount">TA base amount at 100% (₹)</Label>
            <Input
              id="taBaseAmount"
              name="taBaseAmount"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={taBaseAmount}
              placeholder="625"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Per-journey TA when claiming 100%. Journey claims use this × your
              claim %.
            </p>
          </div>
          <div>
            <Label htmlFor="crExpiryDays">CR expiry (days)</Label>
            <Input
              id="crExpiryDays"
              name="crExpiryDays"
              type="number"
              min={1}
              max={365}
              defaultValue={crExpiryDays}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            DA = Basic × %. NDA = (Basic + DA) ÷ 200 per night. TA = base ×
            claim % per journey.
          </p>
          <Button type="submit">Save</Button>
        </form>
        <Link
          href="/settings/holidays"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Manage holiday calendar →
        </Link>
        <Link
          href="/profile"
          className="mt-2 block text-sm text-primary hover:underline"
        >
          Edit profile →
        </Link>
      </CardContent>
    </Card>
  );
}
