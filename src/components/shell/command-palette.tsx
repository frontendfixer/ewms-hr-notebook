"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (
        e.key === "/" &&
        !open &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
      if (
        e.key === "n" &&
        !open &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        // handled by FAB focus - skip
      }
    },
    [open],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    if (!open || query.length < 2) return;
    const t = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setOpen(false);
      setQuery("");
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden rounded border px-1.5 text-xs sm:inline">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh] p-4">
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border border-border bg-card p-4 shadow-xl",
            )}
          >
            <Input
              autoFocus
              placeholder="Search travel, leave, bills..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Type to search all your records
            </p>
          </div>
        </div>
      )}
    </>
  );
}
