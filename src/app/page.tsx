import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export default async function RootPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile?.onboardingDone) {
    redirect("/onboarding");
  }
  redirect("/home");
}
