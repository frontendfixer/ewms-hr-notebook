"use client";

import Link from "next/link";
import { calculateTaAmount, type TourDay } from "@/lib/calculations/allowances";
import { formatCurrencyExact, formatShortDate } from "@/lib/utils";
import { parseLocalDateValue } from "@/lib/date-values";

type TaAllowancePreviewProps = {
  dailyRate: number;
  claimPercent: number;
  slabs: TourDay[];
  manual: boolean;
  beyond8Km: boolean;
  payLevel: number | null;
  usingOverride: boolean;
};

export function TaAllowancePreview({
  dailyRate,
  claimPercent,
  slabs,
  manual,
  beyond8Km,
  payLevel,
  usingOverride,
}: TaAllowancePreviewProps) {
  const amount = calculateTaAmount(dailyRate, claimPercent);

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm" aria-live="polite">
      <p className="font-medium">Daily allowance for this journey</p>
      <p className="text-lg">{formatCurrencyExact(amount)}</p>
      {!beyond8Km && !manual ? (
        <p className="text-xs text-muted-foreground">
          No daily allowance for duty within 8 km of headquarters.
        </p>
      ) : (
        <>
          {!manual && slabs.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {slabs.map((d) => (
                <li key={d.date}>
                  {formatShortDate(parseLocalDateValue(d.date) ?? d.date)}: {d.hours} h away →{" "}
                  {d.percent}%
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrencyExact(dailyRate)}/day × {claimPercent}%
            {usingOverride
              ? " (your rate override)"
              : payLevel != null
                ? ` (Pay Level ${payLevel})`
                : ""}{" "}
            —{" "}
            <Link href="/settings" className="text-primary hover:underline">
              rates in Settings
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
