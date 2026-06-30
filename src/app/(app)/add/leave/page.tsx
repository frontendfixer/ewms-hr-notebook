import { requireUserId } from "@/lib/auth-server";
import { ledgerService } from "@/lib/services/ledger-service";
import { LeaveWizard } from "@/components/flows/leave-wizard";
import { Suspense } from "react";

async function LeaveForm() {
  const userId = await requireUserId();
  const credits = await ledgerService.getAvailableCrCredits(userId);
  return (
    <Suspense fallback={<p className="p-4">Loading...</p>}>
      <LeaveWizard
        credits={credits.map((c) => ({
          ...c,
          expiresAt: c.expiresAt?.toISOString() ?? null,
          earnedAt: c.earnedAt?.toISOString() ?? null,
        }))}
      />
    </Suspense>
  );
}

export default function AddLeavePage() {
  return <LeaveForm />;
}
