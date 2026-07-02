import { requireUserId } from "@/lib/auth-server";
import { feedService } from "@/lib/services/feed-service";
import { ManageLeavesView } from "@/components/flows/manage-leaves-view";

export default async function ManageLeavesPage() {
  const userId = await requireUserId();
  const balances = await feedService.getBalancesSummary(userId);

  return <ManageLeavesView balances={balances} />;
}
