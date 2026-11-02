import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { leaveDayKey } from "@/lib/calculations/leave";
import { getCrExpiryDays } from "@/lib/services/event-service";
import { AddCrForm } from "@/components/flows/add-cr-form";

export default async function AddCrPage() {
  const userId = await requireUserId();
  const [holidays, expiryDays] = await Promise.all([
    prisma.publicHoliday.findMany({ where: { userId } }),
    getCrExpiryDays(userId),
  ]);
  return (
    <AddCrForm
      holidays={Object.fromEntries(holidays.map((h) => [leaveDayKey(h.date), h.name]))}
      expiryDays={expiryDays}
    />
  );
}
