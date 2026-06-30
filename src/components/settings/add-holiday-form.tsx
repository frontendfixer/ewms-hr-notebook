"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { addHoliday } from "@/actions/events";

export function AddHolidayForm() {
  return (
    <form action={addHoliday} className="flex flex-wrap gap-2">
      <DatePicker name="date" required placeholder="Pick date" className="min-w-[10rem] flex-1" />
      <Input name="name" placeholder="Holiday name" required className="flex-1" />
      <Button type="submit">Add</Button>
    </form>
  );
}
