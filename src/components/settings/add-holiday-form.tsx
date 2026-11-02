"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { DatePicker } from "@/components/ui/date-picker";
import { addHoliday, addNationalHolidays, deleteHoliday } from "@/actions/events";
import { toastResult } from "@/lib/action-toast";

export function AddHolidayForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [date, setDate] = useState("");
  return (
    <form
      ref={formRef}
      action={async (fd) => {
        const result = await addHoliday(fd);
        if (toastResult(result, "Holiday added")) {
          formRef.current?.reset();
          setDate("");
        }
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="min-w-[10rem] flex-1">
        <Label>Date</Label>
        <DatePicker name="date" required placeholder="Pick date" value={date} onValueChange={setDate} />
      </div>
      <div className="min-w-[10rem] flex-1">
        <Label htmlFor="holiday-name">Name</Label>
        <Input id="holiday-name" name="name" placeholder="e.g. Durga Puja" required />
      </div>
      <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
    </form>
  );
}

export function AddNationalHolidaysButton({ year }: { year: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          toastResult(await addNationalHolidays(year), `National holidays for ${year} added`);
        })
      }
    >
      Add national holidays {year}
    </Button>
  );
}

export function DeleteHolidayButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Remove ${name}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          toastResult(await deleteHoliday(id), "Holiday removed");
        })
      }
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
