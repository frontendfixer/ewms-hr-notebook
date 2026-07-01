"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const signIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
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
          <Button className="w-full" onClick={signIn}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
