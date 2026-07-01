import Link from "next/link";
import { requireUserId } from "@/lib/auth-server";
import {
  Award,
  BarChart3,
  ChevronRight,
  List,
  Moon,
  Palmtree,
  Search,
  Settings,
  Train,
  User,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import { DOMAIN_STYLES } from "@/lib/design-tokens";
import type { EventDomain } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const recordLinks: Array<{
  href: string;
  label: string;
  icon: typeof Award;
  domain?: EventDomain;
}> = [
  { href: "/records/all", label: "All Records", icon: List },
  { href: "/records/leave", label: "Leave", icon: Palmtree, domain: "LEAVE" },
  { href: "/records/cr", label: "CR", icon: Award, domain: "CR" },
  { href: "/records/night", label: "Night Duty", icon: Moon, domain: "NIGHT_DUTY" },
  { href: "/records/ta", label: "Travel", icon: Train, domain: "TRAVEL" },
];

const accountLinks = [
  { href: "/settings", label: "Settings", icon: Settings, desc: "Pay, TA, holidays" },
  { href: "/profile", label: "Profile", icon: User, desc: "Name, designation, employment no." },
  { href: "/reports", label: "Reports", icon: BarChart3, desc: "Insights & export" },
  { href: "/search", label: "Search", icon: Search, desc: "Find any record" },
];

function NavRow({
  href,
  label,
  icon: Icon,
  desc,
}: {
  href: string;
  label: string;
  icon: typeof Settings;
  desc?: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{label}</p>
            {desc && (
              <p className="truncate text-xs text-muted-foreground">{desc}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function MorePage() {
  await requireUserId();

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">More</h1>
        <p className="text-sm text-muted-foreground">
          Settings, profile, and record lenses
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Account</h2>
        {accountLinks.map((item) => (
          <NavRow key={item.href} {...item} />
        ))}
        <SignOutButton variant="row" />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">My records</h2>
        <div className="grid grid-cols-2 gap-2">
          {recordLinks.map(({ href, label, icon: Icon, domain }) => {
            const styles = domain ? DOMAIN_STYLES[domain] : null;
            return (
              <Link key={href} href={href}>
                <Card
                  className={cn(
                    "transition-shadow hover:shadow-sm",
                    styles && cn("border", styles.card, styles.border),
                  )}
                >
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        styles ? styles.icon : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        styles?.label,
                      )}
                    >
                      {label}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
