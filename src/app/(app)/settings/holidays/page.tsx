import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AddHolidayForm,
  AddNationalHolidaysButton,
  DeleteHolidayButton,
} from "@/components/settings/add-holiday-form";
import { formatDate } from "@/lib/utils";

export default async function HolidaysSettingsPage() {
  const userId = await requireUserId();
  const holidays = await prisma.publicHoliday.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
  const year = new Date().getFullYear();
  const byYear = new Map<number, typeof holidays>();
  for (const h of holidays) {
    const y = h.date.getUTCFullYear();
    byYear.set(y, [...(byYear.get(y) ?? []), h]);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Holiday Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Holidays decide CR eligibility and are skipped when counting CL and CR
          leave. Add your office&apos;s gazetted holidays for the year.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add holiday</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddHolidayForm />
          <div className="flex flex-wrap gap-2">
            <AddNationalHolidaysButton year={year} />
            <AddNationalHolidaysButton year={year + 1} />
          </div>
        </CardContent>
      </Card>
      {holidays.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No holidays saved yet.
        </p>
      ) : (
        [...byYear.entries()].map(([y, list]) => (
          <section key={y} className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {y} · {list.length} holiday{list.length === 1 ? "" : "s"}
            </h2>
            <ul className="space-y-2">
              {list.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm"
                >
                  <span>
                    {formatDate(h.date)} — {h.name}
                  </span>
                  <DeleteHolidayButton id={h.id} name={h.name} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
