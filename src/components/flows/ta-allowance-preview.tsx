"use client";

import Link from "next/link";
import { useMemo } from "react";
import { calculateTaAmount } from "@/lib/calculations/allowances";
import { formatCurrency } from "@/lib/utils";

type TaAllowancePreviewProps = {
  taBaseAmount: number;
  claimPercent: number;
};

export function TaAllowancePreview({
  taBaseAmount,
  claimPercent,
}: TaAllowancePreviewProps) {
  const amount = useMemo(
    () => calculateTaAmount(taBaseAmount, claimPercent),
    [taBaseAmount, claimPercent],
  );

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
      <p className="font-medium">TA for this journey</p>
      <p className="text-lg">{formatCurrency(amount)}</p>
      <p className="text-xs text-muted-foreground">
        {formatCurrency(taBaseAmount)} × {claimPercent}% —{" "}
        <Link href="/settings" className="text-primary hover:underline">
          change base in Settings
        </Link>
      </p>
    </div>
  );
}
