"use client";

import Link from "next/link";
import { useState } from "react";
import { MoreVertical, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeleteEventButton } from "@/components/timeline/delete-event-button";

/** Row menu: edit and delete without taking width from the row itself. */
export function EventActions({
  id,
  label,
  editable,
}: {
  id: string;
  /** Names the entry for screen readers, e.g. "Night duty, Sat 7". */
  label: string;
  /** The edit page re-checks before saving; this only decides whether to offer it. */
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${label}`}
          className="flex w-11 shrink-0 items-center justify-center self-stretch text-muted-foreground transition-colors hover:text-foreground active:bg-accent/60"
        >
          <MoreVertical className="h-4 w-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Entry actions" className="w-40 overflow-hidden">
        {editable && (
          <Link
            href={`/timeline/${id}/edit`}
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-2.5 px-3.5 text-sm transition-colors hover:bg-accent"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </Link>
        )}
        {/* Stays open while deleting so "Deleting…" shows and the row can't be tapped twice. */}
        <DeleteEventButton eventId={id} menuItem />
      </PopoverContent>
    </Popover>
  );
}
