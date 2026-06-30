"use client";

import { CLAIM_STATUS_LABELS } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { transitionClaimStatus } from "@/actions/events";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

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

const nextStatus: Record<ClaimStatus, ClaimStatus | null> = {
  DRAFT: "BILL_SUBMITTED",
  BILL_SUBMITTED: "PASSED",
  PASSED: "PAID",
  PAID: null,
  VOIDED: null,
};

export function StatusTimeline({
  claimEventId,
  currentStatus,
}: {
  claimEventId: string;
  currentStatus: ClaimStatus;
}) {
  const [pending, startTransition] = useTransition();
  const currentIdx = steps.indexOf(currentStatus);

  const advance = (toStatus: ClaimStatus) => {
    const fd = new FormData();
    fd.set("claimEventId", claimEventId);
    fd.set("toStatus", toStatus);
    startTransition(async () => {
      try {
        await transitionClaimStatus(fd);
        toast.success(`Marked as ${CLAIM_STATUS_LABELS[toStatus]}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const done = idx <= currentIdx;
        const isNext = idx === currentIdx + 1;
        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2",
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-muted bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px]",
                    idx < currentIdx ? "bg-emerald-500" : "bg-muted",
                  )}
                />
              )}
            </div>
            <div className="pb-6">
              <p
                className={cn(
                  "font-medium",
                  done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {CLAIM_STATUS_LABELS[step]}
              </p>
              {isNext && currentStatus !== "PAID" && (
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={pending}
                  onClick={() => advance(step)}
                >
                  Mark {CLAIM_STATUS_LABELS[step]}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
