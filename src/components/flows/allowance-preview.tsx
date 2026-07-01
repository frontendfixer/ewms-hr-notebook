"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  calculateNdaTotalFromPercent,
  dearnessAllowanceFromPercent,
} from "@/lib/calculations/allowances";
import { eachDayInclusive, formatCurrency } from "@/lib/utils";

type AllowancePreviewProps = {
  basicPay: number;
  daPercent: number;
  startDate?: string;
  endDate?: string;
};

export function AllowancePreview({
  basicPay,
  daPercent,
  startDate,
  endDate,
}: AllowancePreviewProps) {
  const configured = basicPay > 0;

  const preview = useMemo(() => {
    if (!configured || !startDate) return null;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const nights = eachDayInclusive(start, end).length;
    if (nights === 0) return null;
    const amount = calculateNdaTotalFromPercent(basicPay, daPercent, nights);
    const da = dearnessAllowanceFromPercent(basicPay, daPercent);
    return {
      amount,
      label: nights === 1 ? "NDA for 1 night" : `NDA for ${nights} nights`,
      da,
    };
  }, [basicPay, daPercent, configured, startDate, endDate]);

  if (!configured) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        Set your{" "}
        <Link href="/settings" className="font-medium underline">
          Basic Pay & DA % in Settings
        </Link>{" "}
        to calculate NDA automatically.
      </p>
    );
  }

  if (!preview) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
      <p className="font-medium">{preview.label}</p>
      <p className="text-lg">{formatCurrency(preview.amount)}</p>
      <p className="text-xs text-muted-foreground">
        DA {daPercent}% = {formatCurrency(preview.da)} · (Basic + DA) ÷ 200 per
        night
      </p>
    </div>
  );
}
