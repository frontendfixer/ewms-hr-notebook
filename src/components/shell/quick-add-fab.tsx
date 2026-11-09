"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  Palmtree,
  CirclePlus,
  Moon,
  Train,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOMAIN_STYLES } from "@/lib/design-tokens";
import type { EventDomain } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const quickActions: Array<{
  href: string;
  label: string;
  icon: typeof Palmtree;
  domain?: EventDomain;
}> = [
  { href: "/add/leave", label: "Take Leave", icon: Palmtree, domain: "LEAVE" },
  { href: "/add/cr", label: "Add CR", icon: CirclePlus, domain: "CR" },
  { href: "/add/night-duty", label: "Night Duty", icon: Moon, domain: "NIGHT_DUTY" },
  { href: "/add/travel", label: "Travel", icon: Train, domain: "TRAVEL" },
  { href: "/claims", label: "Update a claim", icon: Wallet },
];

/** Pages where the button would only cover content: forms and statements. */
const HIDDEN_ON = ["/add/", "/reports"];

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (HIDDEN_ON.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[45] bg-black/40 lg:bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-2 print:hidden lg:bottom-6">
        {open && (
          <div className="mb-2 flex flex-col gap-1 rounded-2xl border border-border/60 bg-card p-2 shadow-lg">
            <p className="px-3 py-1 text-xs font-medium text-muted-foreground">Record</p>
            {quickActions.map(({ href, label, icon: Icon, domain }) => {
              const styles = domain ? DOMAIN_STYLES[domain] : null;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                    styles ? cn(styles.card, "hover:opacity-90") : "hover:bg-accent",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg",
                      styles ? styles.icon : "text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={styles?.label}>{label}</span>
                </Link>
              );
            })}
          </div>
        )}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-transform",
            open && "rotate-45",
          )}
          onClick={() => setOpen(!open)}
          aria-label="Quick add"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </>
  );
}
