import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { ledgerService } from "@/lib/services/ledger-service";
import { leaveAccrualService } from "@/lib/services/leave-accrual-service";
import { leaveDayKey } from "@/lib/calculations/leave";
import { LeaveWizard } from "@/components/flows/leave-wizard";
import { Suspense } from "react";

async function LeaveForm() {
  const userId = await requireUserId();
  await leaveAccrualService.ensureAccruals(userId);
  const [credits, balances, holidays] = await Promise.all([
    // Include credits that may still be valid for a leave dated later.
    ledgerService.getAvailableCrCredits(userId),
    ledgerService.getBalances(userId),
    prisma.publicHoliday.findMany({ where: { userId }, select: { date: true } }),
  ]);
  return (
    <Suspense fallback={<p className="p-4">Loading...</p>}>
      <LeaveWizard
        credits={credits.map((c) => ({
          ...c,
          expiresAt: c.expiresAt?.toISOString() ?? null,
          earnedAt: c.earnedAt?.toISOString() ?? null,
        }))}
        balances={{
          CL: balances.LEAVE_CL ?? 0,
          LAP: balances.LEAVE_LAP ?? 0,
          LHAP: balances.LEAVE_LHAP ?? 0,
        }}
        holidays={holidays.map((h) => leaveDayKey(h.date))}
      />
    </Suspense>
  );
}

export default function AddLeavePage() {
  return <LeaveForm />;
}
