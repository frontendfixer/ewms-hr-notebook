"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  fullWidth?: boolean;
  variant?: "button" | "row";
};

export function SignOutButton({
  className,
  fullWidth = false,
  variant = "button",
}: SignOutButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => router.push("/login"),
        },
      });
    });
  };

  if (variant === "row") {
    return (
      <Card className="transition-shadow hover:shadow-sm">
        <CardContent className="p-0">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            className={cn(
              "flex w-full items-center gap-3 p-4 text-left disabled:opacity-50",
              className,
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {pending ? "Signing out…" : "Sign out"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Sign out of your account on this device
              </p>
            </div>
          </button>
        </CardContent>
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
