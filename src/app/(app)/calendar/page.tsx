import { requireUserId } from "@/lib/auth-server";
import { eventService } from "@/lib/services/event-service";
import { CalendarView } from "@/components/calendar/calendar-view";
import { format } from "date-fns";
import type { EventDomain } from "@/generated/prisma/client";

export default async function CalendarPage() {
  const userId = await requireUserId();
  const events = await eventService.getEvents(userId, { limit: 500 });

  const eventsByDate: Record<
    string,
    { id: string; domain: EventDomain; title: string }[]
  > = {};

  for (const e of events) {
    const key = format(e.occurredAt, "yyyy-MM-dd");
    (eventsByDate[key] ??= []).push({
      id: e.id,
      domain: e.domain,
      title: e.title,
    });
  }

  return <CalendarView eventsByDate={eventsByDate} />;
}
