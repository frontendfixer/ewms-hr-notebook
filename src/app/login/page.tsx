import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { LoginPanel } from "@/components/auth/login-panel";
import { loginErrorMessage } from "@/lib/login-errors";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; signedout?: string }>;
}) {
  // Already signed in (say, opening the installed app): skip the login screen.
  const session = await getSession();
  if (session?.user) redirect("/");

  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <LoginPanel
      error={loginErrorMessage(error)}
      signedOut={params.signedout === "1"}
    />
  );
}
