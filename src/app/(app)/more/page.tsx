import Link from "next/link";
import { BarChart3, ChevronRight, Palmtree, Settings } from "lucide-react";
import { requireUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { feedService } from "@/lib/services/feed-service";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LogoGlyph } from "@/components/brand/logo";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";

/** Balances can carry halves; drop float noise but keep the half. */
function days(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function MoreRow({
  href,
  label,
  desc,
  icon: Icon,
}: {
  href: string;
  label: string;
  desc: string;
  icon: typeof Settings;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/60 active:bg-accent"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{desc}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

export default async function MorePage() {
  const userId = await requireUserId();
  const [user, balances] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    feedService.getLeaveBalances(userId),
  ]);
  if (!user) return null;

  const { designation, department } = user.profile ?? {};
  const subtitle = [designation, department].filter(Boolean).join(" · ") || user.email;

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3">
      <h1 className="px-1 text-lg font-semibold leading-tight">More</h1>

      <Link href="/profile" aria-label={`Profile: ${user.name}`} className="block">
        <Card className="flex min-h-16 items-center gap-3 p-3 transition-colors hover:bg-accent/60 active:bg-accent">
          <UserAvatar name={user.name} image={user.image} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </Card>
      </Link>

      <Card className="divide-y divide-border/60 overflow-hidden">
        <MoreRow
          href="/leaves"
          label="Leaves & CR"
          desc={`CL ${days(balances.clBalance)} · LAP ${days(balances.lapBalance)} · LHAP ${days(balances.lhapBalance)} · CR ${days(balances.crBalance)}`}
          icon={Palmtree}
        />
        <MoreRow
          href="/reports"
          label="Reports"
          desc="Insights and CSV export"
          icon={BarChart3}
        />
        <MoreRow
          href="/settings"
          label="Settings"
          desc="Pay, allowances, holidays, appearance"
          icon={Settings}
        />
      </Card>

      <SignOutButton variant="row" />
      <SignOutButton variant="row" scope="all" />

      <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <LogoGlyph className="h-4 w-4 text-primary" />
        EWMS · Personal HR Notebook
      </p>
    </div>
  );
}
