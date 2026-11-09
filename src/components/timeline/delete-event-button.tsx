"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voidEvent } from "@/actions/events";
import { toastResult } from "@/lib/action-toast";
import { cn } from "@/lib/utils";

type DeleteEventButtonProps = {
  eventId: string;
  redirectTo?: string;
  /** Full-width row for use inside a menu. */
  menuItem?: boolean;
  className?: string;
};

export function DeleteEventButton({
  eventId,
  redirectTo,
  menuItem = false,
  className,
}: DeleteEventButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        "Delete this entry? Related credits or ledger changes will be reversed.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await voidEvent(eventId, "Deleted by user");
      if (!toastResult(result, "Entry deleted")) return;
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  };

  if (menuItem) {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 px-3.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50",
          className,
        )}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {pending ? "Deleting…" : "Delete"}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      disabled={pending}
      className={className}
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting…" : "Delete entry"}
    </Button>
  );
}
