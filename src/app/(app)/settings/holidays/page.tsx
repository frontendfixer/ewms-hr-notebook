import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddHolidayForm } from "@/components/settings/add-holiday-form";
import { formatDate } from "@/lib/utils";

export default async function HolidaysSettingsPage() {
  const userId = await requireUserId();
  const holidays = await prisma.publicHoliday.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Holiday Calendar</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add holiday</CardTitle>
        </CardHeader>
        <CardContent>
          <AddHolidayForm />
        </CardContent>
      </Card>
      <ul className="space-y-2">
        {holidays.map((h) => (
          <li key={h.id} className="rounded-xl border p-3 text-sm">
            {formatDate(h.date)} — {h.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
