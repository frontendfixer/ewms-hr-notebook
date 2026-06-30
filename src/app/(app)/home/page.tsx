import { requireUserId } from "@/lib/auth-server";
import { feedService } from "@/lib/services/feed-service";
import { insightService } from "@/lib/services/insight-service";
import { BalanceStrip, FeedList } from "@/components/home/feed-widgets";
import { MonthStatsCard, InsightsCard } from "@/components/home/home-insights";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const userId = await requireUserId();
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile?.onboardingDone) {
    const { redirect } = await import("next/navigation");
    redirect("/onboarding");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const [balances, feed, insights] = await Promise.all([
    feedService.getBalancesSummary(userId),
    feedService.getFeed(userId),
    insightService.getInsights(userId),
  ]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {greeting}, {user?.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Your command center</p>
      </div>

      <BalanceStrip {...balances} />

      <div className="grid gap-4 sm:grid-cols-2">
        <MonthStatsCard insights={insights} />
        <InsightsCard insights={insights} />
      </div>

      <FeedList items={feed} />
    </div>
  );
}
