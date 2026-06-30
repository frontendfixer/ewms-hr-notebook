import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { feedService } from "@/lib/services/feed-service";

export async function GET() {
  const userId = await requireUserId();
  const feed = await feedService.getFeed(userId);
  const balances = await feedService.getBalancesSummary(userId);
  return NextResponse.json({ feed, balances });
}
