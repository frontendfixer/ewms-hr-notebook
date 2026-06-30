"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Home,
  List,
  MoreHorizontal,
  Wallet,
  Clock,
  BarChart3,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/claims", label: "Claims", icon: Wallet },
];

const moreNav = [
  { href: "/records/all", label: "All Records" },
  { href: "/records/leave", label: "Leave" },
  { href: "/records/cr", label: "CR" },
  { href: "/records/night", label: "Night Duty" },
  { href: "/records/ta", label: "Travel" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-border/60 lg:bg-card lg:p-4">
      <div className="mb-6 px-2">
        <span className="text-lg font-bold tracking-tight">EWMS</span>
        <p className="text-xs text-muted-foreground">Personal HR Notebook</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {mainNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
        <div className="my-2 border-t border-border/60" />
        <p className="px-3 text-xs font-medium text-muted-foreground">My Records</p>
        {moreNav.slice(0, 5).map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-xl px-3 py-2 pl-8 text-sm transition-colors",
              pathname === href
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </Link>
        ))}
        <div className="my-2 border-t border-border/60" />
        <Link
          href="/reports"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
            pathname.startsWith("/reports")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Reports
        </Link>
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
            pathname.startsWith("/profile")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <User className="h-4 w-4" />
          Profile
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </nav>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border/60 bg-card/95 backdrop-blur lg:hidden">
      {mainNav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
            pathname === href || pathname.startsWith(href + "/")
              ? "text-primary"
              : "text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
      <Link
        href="/more"
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
          pathname === "/more" ||
            pathname.startsWith("/records") ||
            pathname.startsWith("/settings") ||
            pathname.startsWith("/profile") ||
            pathname.startsWith("/reports") ||
            pathname.startsWith("/search")
            ? "text-primary"
            : "text-muted-foreground",
        )}
      >
        <MoreHorizontal className="h-5 w-5" />
        More
      </Link>
    </nav>
  );
}
