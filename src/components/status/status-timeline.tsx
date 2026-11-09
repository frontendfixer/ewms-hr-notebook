"use client";

import { CLAIM_STATUS_LABELS } from "@/lib/design-tokens";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { DatePicker } from "@/components/ui/date-picker";
import { revertClaimStatus, transitionClaimStatus } from "@/actions/events";
import { toastResult } from "@/lib/action-toast";
import { formatLocalDateValue } from "@/lib/date-values";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Undo2 } from "lucide-react";

type ClaimStatus =
  | "DRAFT"
  | "BILL_SUBMITTED"
  | "PASSED"
  | "PAID"
  | "VOIDED";

const steps: ClaimStatus[] = [
  "DRAFT",
  "BILL_SUBMITTED",
  "PASSED",
  "PAID",
];

/** The first step is a fact (entries exist), not a pending state. */
const STEP_LABELS: Partial<Record<ClaimStatus, string>> = {
  DRAFT: "Entries recorded",
};

function stepLabel(step: ClaimStatus) {
  return STEP_LABELS[step] ?? CLAIM_STATUS_LABELS[step];
}

export type StepDetail = { date?: string; note?: string };

export function StatusTimeline({
  claimEventId,
  currentStatus,
  outstanding,
  shortPaid = 0,
  stepDetails = {},
}: {
  claimEventId: string;
  currentStatus: ClaimStatus;
  /** Amount still to be received; prefilled when marking paid. */
  outstanding: number;
  shortPaid?: number;
  stepDetails?: Partial<Record<ClaimStatus, StepDetail>>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const currentIdx = steps.indexOf(currentStatus);
  const today = formatLocalDateValue(new Date());

  const undo = () => {
    if (!confirm("Undo the last status change?")) return;
    startTransition(async () => {
      if (toastResult(await revertClaimStatus(claimEventId), "Status change undone")) {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const done = idx <= currentIdx;
        const isNext = idx === currentIdx + 1;
        const detail = stepDetails[step];
        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium",
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-muted bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 min-h-4 flex-1",
                    idx < currentIdx ? "bg-emerald-500" : "bg-muted",
                  )}
                />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <p
                className={cn(
                  "text-sm font-medium leading-7",
                  done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {stepLabel(step)}
              </p>
              {done && detail && (detail.date || detail.note) && (
                <p className="text-xs text-muted-foreground">
                  {[detail.date, detail.note].filter(Boolean).join(" · ")}
                </p>
              )}
              {step === "PAID" && shortPaid > 0 && (
                <p className="text-xs font-medium text-destructive">
                  Short-paid by {formatCurrency(shortPaid)}
                </p>
              )}
              {isNext && (
                <form
                  className="mt-2 space-y-2 rounded-xl border border-border p-3"
                  action={async (fd) => {
                    const result = await transitionClaimStatus(fd);
                    if (toastResult(result, `Marked as ${CLAIM_STATUS_LABELS[step]}`)) {
                      router.refresh();
                    }
                  }}
                >
                  <input type="hidden" name="claimEventId" value={claimEventId} />
                  <input type="hidden" name="toStatus" value={step} />
                  {step === "BILL_SUBMITTED" && (
                    <div>
                      <Label htmlFor="billNumber">Bill / CO7 no. (optional)</Label>
                      <Input id="billNumber" name="billNumber" />
                    </div>
                  )}
                  {step === "PAID" && (
                    <>
                      <div>
                        <Label htmlFor="paid-amount">Amount received (₹)</Label>
                        <Input
                          id="paid-amount"
                          name="amount"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.01}
                          defaultValue={outstanding}
                          required
                        />
                      </div>
                      <div>
                        <Label>Paid on</Label>
                        <DatePicker name="paymentDate" defaultValue={today} />
                      </div>
                      <div>
                        <Label htmlFor="paymentReference">Reference (optional)</Label>
                        <Input
                          id="paymentReference"
                          name="paymentReference"
                          placeholder="Pay slip month / UTR"
                        />
                      </div>
                    </>
                  )}
                  <SubmitButton size="sm" disabled={pending} className="h-10 w-full sm:w-auto">
                    Mark {CLAIM_STATUS_LABELS[step]}
                  </SubmitButton>
                </form>
              )}
            </div>
          </div>
        );
      })}
      {currentIdx > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10"
          onClick={undo}
          disabled={pending}
        >
          <Undo2 className="h-4 w-4" />
          Undo last step
        </Button>
      )}
    </div>
  );
}
