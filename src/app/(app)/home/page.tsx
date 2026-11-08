import { requireUserId } from "@/lib/auth-server";
import { feedService } from "@/lib/services/feed-service";
import { insightService } from "@/lib/services/insight-service";
import {
  AttentionList,
  BalancePanel,
  HomeHeader,
  RecentActivity,
} from "@/components/home/feed-widgets";
import { SummaryCard } from "@/components/home/summary-card";
import { prisma } from "@/lib/db";
import { APP_TIME_ZONE } from "@/lib/utils";

export default async function HomePage() {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const [balances, feed, insights] = await Promise.all([
    feedService.getBalancesSummary(userId),
    feedService.getFeed(userId),
    insightService.getInsights(userId),
  ]);

  // The server runs in UTC; greet by the time in India.
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: APP_TIME_ZONE,
    }).format(now),
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: APP_TIME_ZONE,
  }).format(now);

  const reminders = feed.filter((i) => i.type === "REMINDER");
  const holiday = feed.find((i) => i.type === "UPCOMING");
  const activity = feed.filter((i) => i.type === "ACTIVITY");

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3">
      <HomeHeader
        greeting={greeting}
        name={user?.name?.split(" ")[0] ?? "there"}
        today={today}
        holiday={holiday}
      />
      <BalancePanel {...balances} />
      {/* Reminders need action, so they come before the summaries. */}
      <AttentionList items={reminders} />
      <SummaryCard insights={insights} />
      <RecentActivity items={activity} />
    </div>
  );
}
