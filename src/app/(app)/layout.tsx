import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureProfile, getSession } from "@/lib/auth-server";
import { AppSidebar, BottomNav } from "@/components/shell/app-nav";
import { QuickAddFab } from "@/components/shell/quick-add-fab";
import { CommandPalette } from "@/components/shell/command-palette";
import { SessionKeepAlive } from "@/components/auth/session-keep-alive";
import { LogoTile } from "@/components/brand/logo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const profile = await ensureProfile(session.user.id);
  if (!profile.onboardingDone) {
    redirect("/onboarding");
  }

  return (
    // overflow-x-clip, not -hidden: hidden turns this wrapper into a scroll
    // container, which stops the sidebar and header from sticking to the viewport.
    <div className="flex min-h-dvh overflow-x-clip">
      <SessionKeepAlive email={session.user.email} />
      <AppSidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur print:hidden">
          {/* The sidebar (with the logo) is desktop only; this keeps the brand on phones. */}
          <Link href="/home" aria-label="EWMS home" className="shrink-0 lg:hidden">
            <LogoTile size="sm" />
          </Link>
          <CommandPalette />
        </header>
        <main className="min-w-0 flex-1 overflow-x-clip p-4 pb-36 lg:pb-24">{children}</main>
        <QuickAddFab />
        <BottomNav />
      </div>
    </div>
  );
}
