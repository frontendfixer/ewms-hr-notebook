import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyClaimCard } from "@/components/claims/monthly-claim-card";
import type { ClaimPageStats } from "@/lib/services/monthly-claim-service";
import { formatCurrency } from "@/lib/utils";
import { Clock } from "lucide-react";

export function PassedAwaitingPaymentCard({
  data,
}: {
  data: ClaimPageStats["passedAwaitingPayment"];
}) {
  return (
    <div className="space-y-3">
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Passed — awaiting payment</CardTitle>
              <p className="text-xs text-muted-foreground">
                Bills cleared but payment not received
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.settlementCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              No passed bills awaiting payment
            </p>
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold">{formatCurrency(data.totalAmount)}</p>
              <p className="text-sm text-muted-foreground">
                across {data.settlementCount} settlement
                {data.settlementCount === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {data.settlements.length > 0 && (
        <div className="space-y-2">
          {data.settlements.map((settlement) => (
            <MonthlyClaimCard
              key={settlement.id}
              id={settlement.id}
              domain={settlement.domain}
              title={settlement.title}
              childCount={settlement.childCount}
              total={settlement.total}
              status={settlement.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
