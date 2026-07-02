import { requireUserId } from "@/lib/auth-server";
import { ledgerService } from "@/lib/services/ledger-service";
import { monthlyClaimService } from "@/lib/services/monthly-claim-service";
import { ClaimYearStatsCard } from "@/components/claims/claim-year-stats-card";
import { PassedAwaitingPaymentCard } from "@/components/claims/passed-awaiting-payment-card";
import { MonthlyClaimCard } from "@/components/claims/monthly-claim-card";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimStatus } from "@/generated/prisma/client";
import type { ClaimSettlementDomain } from "@/lib/services/monthly-claim-utils";

export default async function ClaimsPage() {
  const userId = await requireUserId();
  const [pendingTotal, pending, stats] = await Promise.all([
    ledgerService.getPendingMoney(userId),
    monthlyClaimService.listPendingSettlements(userId),
    monthlyClaimService.getClaimPageStats(userId),
  ]);

  const remainingPending = pending.filter(
    (settlement) => settlement.status !== ClaimStatus.PASSED,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Claims</h1>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Pending money</p>
          <p className="text-2xl font-bold">{formatCurrency(pendingTotal)}</p>
        </CardContent>
      </Card>
      <ClaimYearStatsCard stats={stats} />
      <PassedAwaitingPaymentCard data={stats.passedAwaitingPayment} />
      <div className="space-y-2">
        {remainingPending.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {pending.length === 0 ? "All claims paid!" : "No other pending settlements"}
          </p>
        ) : (
          remainingPending.map((settlement) => (
            <MonthlyClaimCard
              key={settlement.id}
              id={settlement.id}
              domain={settlement.domain as ClaimSettlementDomain}
              title={settlement.title}
              childCount={settlement.childCount}
              total={settlement.total}
              status={settlement.status}
            />
          ))
        )}
      </div>
    </div>
  );
}
