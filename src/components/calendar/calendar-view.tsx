"use client";

import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DOMAIN_LABELS } from "@/lib/design-tokens";
import { domainCardClass, domainDotClass, domainLabelClass } from "@/lib/domain-styles";
import type { EventDomain } from "@/generated/prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";

type DayEvent = {
  id: string;
  domain: EventDomain;
  title: string;
};

export function CalendarView({
  eventsByDate,
}: {
  eventsByDate: Record<string, DayEvent[]>;
}) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const startPad = startOfMonth(month).getDay();

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : null;
  const selectedEvents = selectedKey ? eventsByDate[selectedKey] ?? [] : [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setMonth(subMonths(month, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[120px] text-center font-medium">
            {format(month, "MMMM yyyy")}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[key] ?? [];
          const domains = [...new Set(dayEvents.map((e) => e.domain))];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(day)}
              className={`flex min-h-[48px] flex-col items-center rounded-xl border p-1 text-sm transition-colors ${
                selected && isSameDay(day, selected)
                  ? "border-primary bg-primary/10"
                  : "border-transparent hover:bg-accent"
              } ${!isSameMonth(day, month) ? "opacity-40" : ""}`}
            >
              <span>{format(day, "d")}</span>
              <div className="flex gap-0.5">
                {domains.slice(0, 4).map((d) => (
                  <span
                    key={d}
                    className={cn("h-1.5 w-1.5 rounded-full", domainDotClass(d))}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 font-medium">{format(selected, "d MMMM yyyy")}</p>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events</p>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/timeline/${e.id}`}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition-opacity hover:opacity-90",
                        domainCardClass(e.domain),
                      )}
                    >
                      <span className={cn("text-xs font-medium", domainLabelClass(e.domain))}>
                        {DOMAIN_LABELS[e.domain]}
                      </span>
                      <p className="font-medium">{e.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
