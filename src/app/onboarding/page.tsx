import { redirect } from "next/navigation";
import { getSession, ensureProfile } from "@/lib/auth-server";
import { Logo } from "@/components/brand/logo";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const profile = await ensureProfile(session.user.id);
  if (profile.onboardingDone) redirect("/home");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <Logo size="lg" tagline href={null} />
      <OnboardingWizard
        userName={session.user.name}
        userImage={session.user.image}
      />
    </div>
  );
}
