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
          <p className="text-sm text-muted-foreground">Claims due to you</p>
          <p className="text-2xl font-bold">{formatCurrency(pendingTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Night duty and travel are grouped into one claim per month. Open a
            month to record the bill and payment.
          </p>
        </CardContent>
      </Card>
      <ClaimYearStatsCard stats={stats} />
      <PassedAwaitingPaymentCard data={stats.passedAwaitingPayment} />
      <div className="space-y-2">
        {remainingPending.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {pending.length === 0
              ? "Nothing pending — all claims are paid."
              : "No other pending months"}
          </p>
        ) : (
          remainingPending.map((settlement) => (
            <MonthlyClaimCard
              key={settlement.id}
              id={settlement.id}
              domain={settlement.domain as ClaimSettlementDomain}
              title={settlement.title}
              childCount={settlement.childCount}
              total={settlement.outstanding}
              status={settlement.status}
            />
          ))
        )}
      </div>
    </div>
  );
}
