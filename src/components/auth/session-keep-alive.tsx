"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { KEEP_ALIVE_EVERY_MS } from "@/lib/session-policy";
import {
  forgetSignedInUser,
  lastKeepAlive,
  markKeepAlive,
  rememberSignedInUser,
  setNeedsConsent,
} from "@/lib/session-hint";

/**
 * Keeps people signed in without a thought: while the app is open it pings the
 * server (at most every few hours) so the session and its cookie slide forward,
 * and the server re-checks the Google grant. Also remembers who is signed in so
 * the login page can sign them straight back in if a session ever does lapse.
 */
export function SessionKeepAlive({ email }: { email: string }) {
  const router = useRouter();
  useEffect(() => {
    rememberSignedInUser(email);

    const ping = async () => {
      if (Date.now() - lastKeepAlive() < KEEP_ALIVE_EVERY_MS) return;
      try {
        const res = await fetch("/api/session/keep-alive", {
          method: "POST",
          credentials: "same-origin",
        });
        // Only a reply counts: an offline attempt must not use up the window.
        markKeepAlive();
        const body = (await res.json().catch(() => null)) as {
          signedIn?: boolean;
          needsConsent?: boolean;
        } | null;
        // Signed out elsewhere, or the Google grant was withdrawn: leave the app,
        // and don't leave this person's email behind for the next one on the device.
        if (res.status === 401 || body?.signedIn === false) {
          forgetSignedInUser();
          router.replace("/login");
          return;
        }
        if (typeof body?.needsConsent === "boolean") setNeedsConsent(body.needsConsent);
      } catch {
        // Offline: try again next time.
      }
    };

    void ping();
    const onVisible = () => {
      if (document.visibilityState === "visible") void ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void ping(), 60 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [email, router]);

  return null;
}
