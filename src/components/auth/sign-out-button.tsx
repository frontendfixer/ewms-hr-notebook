"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { forgetSignedInUser } from "@/lib/session-hint";

type SignOutButtonProps = {
  className?: string;
  fullWidth?: boolean;
  variant?: "button" | "row";
  /** "all" ends every session of this account (a lost phone, a shared device). */
  scope?: "device" | "all";
};

export function SignOutButton({
  className,
  fullWidth = false,
  variant = "button",
  scope = "device",
}: SignOutButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSignOut = () => {
    if (
      scope === "all" &&
      !confirm("Sign out of every device, including this one? You'll need to sign in again.")
    ) {
      return;
    }
    startTransition(async () => {
      if (scope === "all") await authClient.revokeSessions();
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            // Signing out on purpose: don't sign straight back in on the login page.
            forgetSignedInUser();
            router.push("/login?signedout=1");
          },
        },
      });
    });
  };

  if (variant === "row") {
    return (
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={pending}
          className={cn(
            "flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-destructive/5 active:bg-destructive/10 disabled:opacity-50",
            className,
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="text-sm font-medium text-destructive">
            {pending ? "Signing out…" : scope === "all" ? "Sign out of all devices" : "Sign out"}
          </span>
        </button>
      </Card>
    );
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleSignOut}
      disabled={pending}
      className={cn(fullWidth && "w-full", className)}
    >
      <LogOut className="h-4 w-4" />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
