"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CalendarDays, Loader2, Moon, ShieldCheck, Train, Wallet } from "lucide-react";
import { LogoTile } from "@/components/brand/logo";
import { authClient } from "@/lib/auth-client";
import {
  autoSignInAlreadyTried,
  forgetSignedInUser,
  markAutoSignInTried,
  needsConsent,
  readSignInHint,
} from "@/lib/session-hint";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

const FEATURES = [
  { icon: Moon, text: "Night duty allowance, worked out for you" },
  { icon: Train, text: "Travel allowance and journeys" },
  { icon: CalendarDays, text: "CR credits and leave balances" },
  { icon: Wallet, text: "Monthly bills and what is still due" },
] as const;

export function LoginPanel({
  error,
  signedOut,
}: {
  /** Already-worded message for a failed or cancelled sign-in. */
  error: string | null;
  /** Arrived by signing out on purpose. */
  signedOut: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // localStorage is read on the client only; the server render shows no hint.
  const hint = useSyncExternalStore(
    () => () => {},
    readSignInHint,
    () => null,
  );

  const start = async (loginHint: string | null, chooseAccount = false) => {
    setBusy(true);
    setFailed(false);
    markAutoSignInTried();
    // Google only hands out a refresh token when the user consents, so ask once if
    // the server has none for this person. Choosing another account always asks Google to show the chooser.
    const prompt = chooseAccount ? "select_account" : needsConsent() ? "consent" : null;
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/login",
        ...(loginHint ? { loginHint } : {}),
        ...(prompt ? { additionalParams: { prompt } } : {}),
      });
      if (result?.error) throw new Error(result.error.message);
      // On success the browser is already on its way to Google.
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  // A returning user whose session lapsed: ask Google to sign them straight back
  // in. Google shows nothing if they are still signed in there. Tried once per
  // tab, and never after signing out on purpose or after an error.
  useEffect(() => {
    const remembered = readSignInHint();
    if (remembered && !error && !signedOut && !autoSignInAlreadyTried()) {
      // Marked at once, not in the deferred call: React's dev double-run of effects
      // would otherwise start two sign-ins.
      markAutoSignInTried();
      // Deferred so the busy state is set from a callback, not during the effect.
      queueMicrotask(() => void start(remembered));
    }
    // Runs once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from Google on iOS Safari restores this page as it was, spinner and all.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const message = failed ? "Couldn’t reach Google. Check your connection and try again." : error;

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-primary/10 via-background to-background px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center gap-8 py-8">
          <div className="space-y-4">
            <LogoTile size="lg" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">EWMS</h1>
              <p className="mt-1 text-base text-muted-foreground">
                Your personal Indian Railways HR notebook
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          {signedOut && !message && (
            <p role="status" className="text-center text-sm text-muted-foreground">
              You’ve been signed out.
            </p>
          )}
          {message && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={() => void start(hint)}
            disabled={busy}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card text-base font-semibold shadow-sm transition-colors hover:bg-accent active:bg-accent disabled:opacity-70"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <GoogleMark className="h-5 w-5" />
            )}
            {busy
              ? hint
                ? "Signing you in…"
                : "Opening Google…"
              : hint && !signedOut
                ? "Continue with Google"
                : "Sign in with Google"}
          </button>

          {hint && !busy && (
            <button
              type="button"
              onClick={() => {
                // A different person or account: forget the remembered one and let Google ask.
                forgetSignedInUser();
                void start(null, true);
              }}
              className="flex min-h-11 w-full items-center justify-center text-sm font-medium text-primary hover:underline"
            >
              Use a different Google account
            </button>
          )}

          <p className="flex items-start justify-center gap-1.5 pt-1 text-center text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Only your name, email and photo are used. You stay signed in on this device; sign
              out any time from More.
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}
