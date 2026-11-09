import Link from "next/link";
import { ChevronRight, Moon, Train } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CLAIM_PILL_LABELS, DOMAIN_STYLES, claimStatusVariant } from "@/lib/design-tokens";
import { formatRange } from "@/lib/event-summary";
import { waitingNote, type SettlementView } from "@/lib/claim-summary";
import { cn, formatCurrencyExact, formatShortDate } from "@/lib/utils";

const DOMAIN = {
  NIGHT_DUTY: { icon: Moon, label: "Night duty", unit: "night" },
  TRAVEL: { icon: Train, label: "Travel", unit: "journey" },
} as const;

/** What to show under the headline: the facts a person chasing the bill needs. */
function metaFor(view: SettlementView): string[] {
  const meta: string[] = [];
  // Most important first: the narrow middle column clips from the end.
  const waiting = waitingNote(view);
  if (waiting) meta.push(waiting);
  if (view.status === "PAID") {
    const last = view.payments.at(-1);
    if (view.shortPaid > 0) meta.push(`Short by ${formatCurrencyExact(view.shortPaid)}`);
    else if (last) meta.push(`Paid ${formatShortDate(last.at)}`);
  } else if (view.paid > 0) {
    meta.push(`${formatCurrencyExact(view.paid)} received`);
  }
  if (view.firstEntry && view.lastEntry) meta.push(formatRange(view.firstEntry, view.lastEntry));
  // A reopened (draft again) month no longer has a live bill to show a number for.
  if (view.bill?.number && view.status !== "DRAFT") meta.push(`Bill ${view.bill.number}`);
  return meta;
}

/** One monthly bill: what it is, where it stands, and the amount still to come. */
export function SettlementRow({ view }: { view: SettlementView }) {
  const { icon: Icon, label, unit } = DOMAIN[view.domain];
  const styles = DOMAIN_STYLES[view.domain];
  const open = view.outstanding > 0;
  const meta = metaFor(view);

  return (
    <Link
      href={`/claims/${view.id}`}
      className="flex min-h-16 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40 active:bg-accent/60"
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", styles.icon)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">
          {label}
          <span className="font-normal text-muted-foreground">
            {" "}
            · {view.entryCount} {unit}
            {view.entryCount === 1 ? "" : "s"}
          </span>
        </span>
        {meta.length > 0 && (
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
            {meta.join(" · ")}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            !open && "font-medium text-muted-foreground",
          )}
        >
          {formatCurrencyExact(open ? view.outstanding : view.total)}
        </span>
        <Badge
          variant={view.shortPaid > 0 ? "critical" : claimStatusVariant(view.status)}
          className="px-2 py-0 text-[11px] leading-5"
        >
          {view.shortPaid > 0 ? "Short-paid" : (CLAIM_PILL_LABELS[view.status] ?? view.status)}
        </Badge>
      </span>
      <ChevronRight className="-mr-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
