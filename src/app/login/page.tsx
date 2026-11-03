"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Better Auth sends failed or cancelled OAuth sign-ins back here with ?error=<code>.
function SignInError() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  return (
    <p role="alert" className="mb-3 text-sm text-destructive">
      Sign-in didn&apos;t complete. Please try again.
    </p>
  );
}

export default function LoginPage() {
  const signIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/login",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">EWMS</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your personal Indian Railways HR notebook
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <SignInError />
          </Suspense>
          <Button className="w-full" onClick={signIn}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
