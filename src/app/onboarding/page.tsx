import { redirect } from "next/navigation";
import { getSession, ensureProfile } from "@/lib/auth-server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const profile = await ensureProfile(session.user.id);
  if (profile.onboardingDone) redirect("/home");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <OnboardingWizard
        userName={session.user.name}
        userImage={session.user.image}
      />
    </div>
  );
}
