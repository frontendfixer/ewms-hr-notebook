"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  calculateNda,
  daPercentOn,
  NDA_BASIC_PAY_CEILING,
  NDA_MAX_PAY_LEVEL,
} from "@/lib/calculations/allowances";
import { parseLocalDateValue } from "@/lib/date-values";
import { eachDayInclusive, formatCurrencyExact } from "@/lib/utils";

type AllowancePreviewProps = {
  basicPay: number;
  payLevel: number | null;
  daPercentOverride: number | null;
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function AllowancePreview({
  basicPay,
  payLevel,
  daPercentOverride,
  startDate,
  endDate,
  startTime,
  endTime,
}: AllowancePreviewProps) {
  const configured = basicPay > 0;

  const preview = useMemo(() => {
    const start = parseLocalDateValue(startDate);
    if (!configured || !start) return null;
    const end = parseLocalDateValue(endDate) ?? start;
    const nights = eachDayInclusive(start, end);
    if (nights.length === 0) return null;
    const perNight = nights.map((d) =>
      calculateNda(basicPay, daPercentOn(d, daPercentOverride), startTime, endTime),
    );
    const total = perNight.reduce((sum, n) => sum + n.amount, 0);
    const daPercents = [...new Set(perNight.map((n) => n.daPercent))];
    return { nights: nights.length, first: perNight[0], total, daPercents };
  }, [basicPay, daPercentOverride, configured, startDate, endDate, startTime, endTime]);

  if (!configured) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        Set your{" "}
        <Link href="/settings" className="font-medium underline">
          Basic Pay & Pay Level in Settings
        </Link>{" "}
        to calculate NDA automatically.
      </p>
    );
  }

  const levelWarning =
    payLevel != null && payLevel > NDA_MAX_PAY_LEVEL ? (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        NDA is admissible up to Pay Level {NDA_MAX_PAY_LEVEL}
        {payLevel === NDA_MAX_PAY_LEVEL + 1
          ? " — Level 8 only if reached through MACP."
          : "."}
      </p>
    ) : null;

  if (!preview) return levelWarning;

  const { first } = preview;
  return (
    <div className="space-y-2">
      {levelWarning}
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm" aria-live="polite">
        <p className="font-medium">
          NDA for {preview.nights} night{preview.nights === 1 ? "" : "s"}
        </p>
        <p className="text-lg">{formatCurrencyExact(preview.total)}</p>
        {first.nightMinutes === 0 ? (
          <p className="text-xs text-destructive">
            No part of this duty falls between 22:00 and 06:00.
          </p>
        ) : (
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <li>
              Night hours (22:00–06:00): {formatMinutes(first.nightMinutes)} → paid
              weightage {formatMinutes(first.weightageHours * 60)} per night
            </li>
            <li>
              Hourly rate {formatCurrencyExact(first.hourlyRate)} = (Basic{" "}
              {formatCurrencyExact(first.ndaBasicPay)} + DA{" "}
              {preview.daPercents.join("/")}%) ÷ 200
            </li>
            {basicPay > NDA_BASIC_PAY_CEILING && (
              <li>
                Basic pay capped at {formatCurrencyExact(NDA_BASIC_PAY_CEILING)} for NDA
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
