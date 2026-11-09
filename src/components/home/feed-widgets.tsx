import Link from "next/link";
import {
  AlertTriangle,
  Award,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Moon,
  Palmtree,
  Train,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { DOMAIN_STYLES } from "@/lib/design-tokens";
import { APP_TIME_ZONE, cn, formatCurrency, formatShortDate } from "@/lib/utils";
import type { FeedItem } from "@/lib/services/feed-service";
import type { EventDomain } from "@/generated/prisma/client";

type Reminder = Extract<FeedItem, { type: "REMINDER" }>;
type Activity = Extract<FeedItem, { type: "ACTIVITY" }>;
type Upcoming = Extract<FeedItem, { type: "UPCOMING" }>;

const DOMAIN_ICONS = {
  CR: Award,
  LEAVE: Palmtree,
  NIGHT_DUTY: Moon,
  TRAVEL: Train,
  META: CalendarDays,
} satisfies Record<EventDomain, typeof Award>;

/** Balances can carry halves (0.5 CR); drop float noise but keep the half. */
function formatDays(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Whole calendar days from today (in India) to a date-only value stored as UTC midnight. */
function daysUntil(date: Date): number {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(
    new Date(),
  );
  const target = date.toISOString().slice(0, 10);
  return Math.round((Date.parse(target) - Date.parse(today)) / 86_400_000);
}

function holidayWhen(date: Date): string {
  const days = daysUntil(date);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 14) return `in ${days} days`;
  return `on ${formatShortDate(date)}`;
}

export function HomeHeader({
  greeting,
  name,
  today,
  holiday,
}: {
  greeting: string;
  name: string;
  today: string;
  holiday?: Upcoming;
}) {
  const holidayName = holiday?.title.replace(/^Next holiday:\s*/, "");
  return (
    <header className="min-w-0 px-1">
      <h1 className="truncate text-lg font-semibold leading-tight">
        {greeting}, {name}
      </h1>
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="shrink-0">{today}</span>
        {holiday && holidayName && (
          <>
            <span aria-hidden>·</span>
            <Link
              href="/settings/holidays"
              className="flex min-w-0 items-center gap-1 hover:text-foreground"
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {holidayName} {holidayWhen(holiday.date)}
              </span>
            </Link>
          </>
        )}
      </p>
    </header>
  );
}

export function BalancePanel({
  crBalance,
  clBalance,
  lapBalance,
  lhapBalance,
  pendingMoney,
}: {
  crBalance: number;
  clBalance: number;
  lapBalance: number;
  lhapBalance: number;
  pendingMoney: number;
}) {
  const tiles = [
    { label: "CR", value: crBalance, href: "/timeline?filter=CR", domain: "CR" as const },
    { label: "CL", value: clBalance, href: "/leaves", domain: "LEAVE" as const },
    { label: "LAP", value: lapBalance, href: "/leaves", domain: "LEAVE" as const },
    { label: "LHAP", value: lhapBalance, href: "/leaves", domain: "LEAVE" as const },
  ];
  const due = pendingMoney > 0;

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-4 divide-x divide-border/60">
        {tiles.map(({ label, value, href, domain }) => {
          const styles = DOMAIN_STYLES[domain];
          return (
            <Link
              key={label}
              href={href}
              aria-label={`${label} balance: ${formatDays(value)} days`}
              className="flex flex-col items-center px-1 pb-2.5 pt-3 transition-colors hover:bg-accent/60 active:bg-accent"
            >
              <span
                className={cn(
                  "flex items-center gap-1 text-[11px] font-semibold",
                  styles.label,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} aria-hidden />
                {label}
              </span>
              <span className="mt-0.5 text-xl font-bold tabular-nums leading-tight">
                {formatDays(value)}
              </span>
              <span className="text-[10px] text-muted-foreground">days</span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/claims"
        className={cn(
          "flex items-center gap-2 border-t border-border/60 px-3 py-2.5 text-sm transition-colors",
          due ? "bg-amber-500/10 hover:bg-amber-500/15" : "hover:bg-accent/60",
        )}
      >
        <Wallet
          className={cn(
            "h-4 w-4 shrink-0",
            due ? DOMAIN_STYLES.TRAVEL.label : "text-muted-foreground",
          )}
          aria-hidden
        />
        <span className="flex-1 text-muted-foreground">Claims due</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            due ? DOMAIN_STYLES.TRAVEL.label : "text-muted-foreground",
          )}
        >
          {due ? formatCurrency(pendingMoney) : "All settled"}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </Card>
  );
}

function ReminderRow({ item }: { item: Reminder }) {
  const urgent = item.priority === "high";
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5", urgent && "bg-amber-500/10")}>
      <AlertTriangle
        className={cn(
          "h-4 w-4 shrink-0",
          urgent ? "text-amber-600 dark:text-amber-400" : "text-amber-500/70",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        {item.body && <p className="text-xs text-muted-foreground">{item.body}</p>}
      </div>
      {item.action && (
        <Link
          href={item.action.href}
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-3 text-xs font-medium",
            urgent
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary hover:bg-primary/15",
          )}
        >
          {item.action.label}
        </Link>
      )}
    </div>
  );
}

const VISIBLE_REMINDERS = 2;

export function AttentionList({ items }: { items: Reminder[] }) {
  if (items.length === 0) return null;
  const head = items.slice(0, VISIBLE_REMINDERS);
  const rest = items.slice(VISIBLE_REMINDERS);

  return (
    <section aria-labelledby="home-attention">
      <h2
        id="home-attention"
        className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground"
      >
        Needs attention
        <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[11px] text-amber-700 dark:text-amber-300">
          {items.length}
        </span>
      </h2>
      <Card className="divide-y divide-border/60 overflow-hidden">
        {head.map((item, i) => (
          <ReminderRow key={`${item.title}-${i}`} item={item} />
        ))}
        {rest.length > 0 && (
          <details className="group">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-1 px-3 text-xs font-medium text-primary hover:bg-accent/60 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show {rest.length} more</span>
              <span className="hidden group-open:inline">Show less</span>
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="divide-y divide-border/60 border-t border-border/60">
              {rest.map((item, i) => (
                <ReminderRow key={`${item.title}-${i}`} item={item} />
              ))}
            </div>
          </details>
        )}
      </Card>
    </section>
  );
}

const FIRST_RUN_ACTIONS = [
  { href: "/add/night-duty", label: "Night duty", icon: Moon, domain: "NIGHT_DUTY" },
  { href: "/add/travel", label: "Travel", icon: Train, domain: "TRAVEL" },
  { href: "/add/leave", label: "Leave", icon: Palmtree, domain: "LEAVE" },
  { href: "/add/cr", label: "CR", icon: Award, domain: "CR" },
] as const;

export function RecentActivity({ items }: { items: Activity[] }) {
  if (items.length === 0) {
    return (
      <section aria-labelledby="home-start">
        <h2 id="home-start" className="mb-1.5 px-1 text-xs font-semibold text-muted-foreground">
          Get started
        </h2>
        <Card className="p-3">
          <p className="mb-2 text-sm text-muted-foreground">
            Nothing recorded yet. Add your first entry:
          </p>
          <div className="grid grid-cols-4 gap-2">
            {FIRST_RUN_ACTIONS.map(({ href, label, icon: Icon, domain }) => {
              const styles = DOMAIN_STYLES[domain];
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-medium",
                    styles.card,
                    styles.label,
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="home-recent">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <h2 id="home-recent" className="text-xs font-semibold text-muted-foreground">
          Recent activity
        </h2>
        <Link href="/timeline" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>
      <Card className="divide-y divide-border/60 overflow-hidden">
        {items.map((item, i) => {
          const Icon = DOMAIN_ICONS[item.domain];
          const styles = DOMAIN_STYLES[item.domain];
          return (
            <Link
              key={item.id}
              href={`/timeline/${item.id}`}
              // Rows 4+ only fit on wider screens; mobile shows the latest three.
              className={cn(
                "min-h-11 min-w-0 items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/60 active:bg-accent",
                i < 3 ? "flex" : "hidden sm:flex",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  styles.icon,
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatShortDate(item.occurredAt)}
              </span>
            </Link>
          );
        })}
      </Card>
    </section>
  );
}
