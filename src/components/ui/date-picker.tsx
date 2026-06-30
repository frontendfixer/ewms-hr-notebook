"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatDisplayDate,
  formatLocalDateValue,
  parseLocalDateValue,
} from "@/lib/date-values";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  name: string;
  id?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
  /** Close popover after a date is chosen. Default: true */
  closeOnSelect?: boolean;
};

export function DatePicker({
  name,
  id,
  required,
  defaultValue,
  value: controlledValue,
  onValueChange,
  placeholder = "Pick a date",
  disabled,
  className,
  fromYear = 1990,
  toYear = new Date().getFullYear() + 2,
  closeOnSelect = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolled;
  const selected = parseLocalDateValue(value);

  const setValue = (next: string) => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  };

  return (
    <>
      <input type="hidden" name={name} value={value} required={required} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-start rounded-xl px-3 text-left font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
            {selected ? formatDisplayDate(selected) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              setValue(formatLocalDateValue(date));
              if (closeOnSelect) setOpen(false);
            }}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            className="rounded-lg"
          />
          {!closeOnSelect && (
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
