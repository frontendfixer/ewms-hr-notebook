import { requireUserId } from "@/lib/auth-server";
import { insightService } from "@/lib/services/insight-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InsightsPage() {
  const userId = await requireUserId();
  const insights = await insightService.getInsights(userId);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Personal Insights</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sundays</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{insights.sundaysWorkedThisYear}</p>
            <p className="text-xs text-muted-foreground">worked this year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Night Duty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{insights.avgNightDutyPerMonth}</p>
            <p className="text-xs text-muted-foreground">avg per month</p>
          </CardContent>
        </Card>
        {insights.mostVisited && (
          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Most Visited</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{insights.mostVisited}</p>
              <p className="text-sm text-muted-foreground">
                {insights.mostVisitedCount} trips
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
