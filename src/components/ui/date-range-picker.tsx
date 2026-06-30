"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatDisplayDateRange,
  formatLocalDateValue,
  parseLocalDateValue,
} from "@/lib/date-values";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  startName: string;
  endName: string;
  required?: boolean;
  defaultStart?: string;
  defaultEnd?: string;
  onRangeChange?: (start: string, end: string) => void;
  placeholder?: string;
  optionalEnd?: boolean;
  disabled?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
  /**
   * Close popover after selection. Default: true when range is complete
   * (both ends for required ranges; start only when optionalEnd).
   * Set false to keep open until Done is tapped.
   */
  closeOnSelect?: boolean;
};

function toRange(start: string, end: string): DateRange | undefined {
  const from = parseLocalDateValue(start);
  if (!from) return undefined;
  const to = parseLocalDateValue(end) ?? from;
  return { from, to };
}

export function DateRangePicker({
  startName,
  endName,
  required,
  defaultStart = "",
  defaultEnd = "",
  onRangeChange,
  placeholder = "Pick date range",
  optionalEnd = false,
  disabled,
  className,
  fromYear = 1990,
  toYear = new Date().getFullYear() + 2,
  closeOnSelect,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [start, setStart] = React.useState(defaultStart);
  const [end, setEnd] = React.useState(defaultEnd);
  const range = toRange(start, end);
  const shouldAutoClose = closeOnSelect ?? true;

  const applyRange = (next: DateRange | undefined) => {
    const nextStart = formatLocalDateValue(next?.from);
    const nextEnd = next?.to
      ? formatLocalDateValue(next.to)
      : optionalEnd
        ? ""
        : formatLocalDateValue(next?.from);
    setStart(nextStart);
    setEnd(nextEnd);
    onRangeChange?.(nextStart, nextEnd);

    if (!shouldAutoClose) return;

    const complete =
      optionalEnd ? Boolean(next?.from) : Boolean(next?.from && next?.to);
    if (complete) setOpen(false);
  };

  const endRequired = required && !optionalEnd;

  return (
    <>
      <input type="hidden" name={startName} value={start} required={required} />
      <input type="hidden" name={endName} value={end} required={endRequired} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-start rounded-xl px-3 text-left font-normal",
              !range?.from && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
            {range?.from
              ? formatDisplayDateRange(range.from, range.to)
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            onSelect={applyRange}
            defaultMonth={range?.from}
            numberOfMonths={1}
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            className="rounded-lg"
          />
          {!shouldAutoClose && (
            <div className="border-t border-border p-2">
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
