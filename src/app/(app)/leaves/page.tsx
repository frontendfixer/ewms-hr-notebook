import { requireUserId } from "@/lib/auth-server";
import { feedService } from "@/lib/services/feed-service";
import { ledgerService } from "@/lib/services/ledger-service";
import { ManageLeavesView } from "@/components/flows/manage-leaves-view";

export default async function ManageLeavesPage() {
  const userId = await requireUserId();
  const [balances, credits] = await Promise.all([
    feedService.getBalancesSummary(userId),
    ledgerService.getAvailableCrCredits(userId),
  ]);

  return <ManageLeavesView balances={balances} crCredits={credits} />;
}
