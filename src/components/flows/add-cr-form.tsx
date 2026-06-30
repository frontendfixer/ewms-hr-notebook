"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { formatLocalDateValue } from "@/lib/date-values";
import { recordHolidayWork } from "@/actions/events";
import { toast } from "sonner";

export function AddCrForm() {
  const router = useRouter();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultWorkDate = formatLocalDateValue(yesterday);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Add CR</CardTitle>
        <p className="text-sm text-muted-foreground">
          Record work on any day to earn compensatory rest (CR)
        </p>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            try {
              await recordHolidayWork(fd);
              toast.success("CR recorded!");
              router.push("/home");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label>Work date</Label>
            <DatePicker
              name="workDate"
              required
              defaultValue={defaultWorkDate}
            />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea name="remarks" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Record
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
