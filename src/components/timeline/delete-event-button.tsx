"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voidEvent } from "@/actions/events";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DeleteEventButtonProps = {
  eventId: string;
  redirectTo?: string;
  compact?: boolean;
  className?: string;
};

export function DeleteEventButton({
  eventId,
  redirectTo,
  compact = false,
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
      try {
        await voidEvent(eventId, "Deleted by user");
        toast.success("Entry deleted");
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Delete entry"
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50",
          className,
        )}
      >
        <Trash2 className="h-4 w-4" />
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
