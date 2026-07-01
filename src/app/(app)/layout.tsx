import { redirect } from "next/navigation";
import { ensureProfile, getSession } from "@/lib/auth-server";
import { AppSidebar, BottomNav } from "@/components/shell/app-nav";
import { QuickAddFab } from "@/components/shell/quick-add-fab";
import { CommandPalette } from "@/components/shell/command-palette";

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
    <div className="flex min-h-screen overflow-x-hidden">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
          <CommandPalette />
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-24 lg:pb-6">{children}</main>
        <QuickAddFab />
        <BottomNav />
      </div>
    </div>
  );
}
