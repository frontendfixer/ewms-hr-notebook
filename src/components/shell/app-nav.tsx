"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Clock,
  Home,
  MoreHorizontal,
  Palmtree,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { isActive, isMoreActive } from "@/lib/nav-routes";

type NavItem = { href: string; label: string; icon: LucideIcon };

const mainNav: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/claims", label: "Claims", icon: Wallet },
];

/** Secondary destinations: the sidebar lists them, the More page is their mobile home. */
const secondaryNav: NavItem[] = [
  { href: "/leaves", label: "Leaves", icon: Palmtree },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarLink({ href, label, icon: Icon }: NavItem) {
  const active = isActive(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary"
        />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] transition-transform",
          !active && "group-hover:scale-110",
        )}
        aria-hidden
      />
      {label}
    </Link>
  );
}

function SidebarSection({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {items.map((item) => (
        <SidebarLink key={item.href} {...item} />
      ))}
    </div>
  );
}

type ShellUser = { name: string; email: string; image?: string | null };

/**
 * Desktop sidebar. Sticky and exactly one viewport tall, so it stays put while
 * the page scrolls; its own list scrolls if the window is very short.
 */
export function AppSidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const onProfile = isActive(pathname, "/profile");

  return (
    <aside
      className="hidden print:hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:self-start lg:border-r lg:border-border/60 lg:bg-card/60 lg:backdrop-blur-xl"
    >
      <Logo size="md" tagline className="px-6 pb-4 pt-6" />

      <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
        <SidebarSection label="Menu" items={mainNav} />
        <SidebarSection label="Manage" items={secondaryNav} />
      </nav>

      <div className="border-t border-border/60 p-3">
        <Link
          href="/profile"
          aria-current={onProfile ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition-colors",
            onProfile ? "bg-primary/10" : "hover:bg-accent",
          )}
        >
          <UserAvatar name={user.name} image={user.image} size="md" decorative />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

function DockItem({
  href,
  label,
  icon: Icon,
  active,
}: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium"
    >
      <span
        className={cn(
          "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
          active ? "bg-primary/15 text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className={active ? "text-primary" : "text-muted-foreground"}>{label}</span>
    </Link>
  );
}

/** Mobile dock: a floating, blurred pill pinned to the viewport above the safe area. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md rounded-3xl border border-border/60 bg-card/80 p-1 shadow-lg shadow-black/10 backdrop-blur-xl print:hidden lg:hidden"
    >
      {mainNav.map((item) => (
        <DockItem key={item.href} {...item} active={isActive(pathname, item.href)} />
      ))}
      <DockItem
        href="/more"
        label="More"
        icon={MoreHorizontal}
        active={isMoreActive(pathname)}
      />
    </nav>
  );
}
