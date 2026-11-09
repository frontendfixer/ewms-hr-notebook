"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const iconButton =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent";

/** Month inputs and showPicker() are missing in desktop Firefox and older Safari. */
function pickerSupported(): boolean {
  const probe = document.createElement("input");
  probe.type = "month";
  return probe.type === "month" && typeof probe.showPicker === "function";
}

/**
 * Previous / next month and a tap-to-pick label. Picking applies at once, so
 * there is no separate "Go" button.
 */
export function MonthPicker({
  monthKey,
  label,
  prevHref,
  nextHref,
  currentHref,
}: {
  /** `yyyy-MM` of the month being shown. */
  monthKey: string;
  label: string;
  prevHref: string;
  nextHref: string;
  /** Link back to the current month, or null when already on it. */
  currentHref: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const supported = useSyncExternalStore(
    () => () => {},
    pickerSupported,
    () => true,
  );

  // The native "change" event fires when a month is committed. React's onChange
  // listens to "input", which some mobile pickers fire while the wheel still
  // turns; navigating then would remount the input and close the picker.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const onCommit = () => {
      if (/^\d{4}-\d{2}$/.test(el.value)) router.push(`/reports?month=${el.value}`);
    };
    el.addEventListener("change", onCommit);
    return () => el.removeEventListener("change", onCommit);
  }, [router, supported]);

  const open = () => {
    try {
      input.current?.showPicker();
    } catch {
      // Not allowed right now; the arrows still work.
    }
  };

  return (
    <nav aria-label="Month" className="flex items-center gap-2 print:hidden">
      <Link href={prevHref} className={iconButton} aria-label="Previous month">
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </Link>
      {supported ? (
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={open}
            aria-label={`${label}. Choose another month`}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card text-sm font-semibold transition-colors hover:bg-accent active:bg-accent"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
            {label}
          </button>
          <input
            ref={input}
            key={monthKey}
            type="month"
            defaultValue={monthKey}
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0"
          />
        </div>
      ) : (
        // No month picker here: show the month; the arrows and the year chart navigate.
        <p
          aria-live="polite"
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card text-sm font-semibold"
        >
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
          {label}
        </p>
      )}
      <Link href={nextHref} className={iconButton} aria-label="Next month">
        <ChevronRight className="h-5 w-5" aria-hidden />
      </Link>
      {currentHref && (
        <Link
          href={currentHref}
          className="flex min-h-11 shrink-0 items-center px-1 text-xs font-medium text-primary hover:underline"
        >
          Today
        </Link>
      )}
    </nav>
  );
}
