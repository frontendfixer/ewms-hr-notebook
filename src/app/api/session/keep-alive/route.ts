import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revalidateGoogleGrant } from "@/lib/session-health-server";

/**
 * Called by the app while it is open. Reading the session here (a route
 * handler, where cookies can be written) lets Better Auth push the expiry out
 * and renew the cookie, so people who use the app stay signed in. It also
 * re-checks the Google grant once a day.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ ok: false, signedIn: false }, { status: 401 });
  }
  const { check, needsConsent } = await revalidateGoogleGrant(session.user.id);
  const stillSignedIn = check !== "revoked";
  return NextResponse.json(
    { ok: stillSignedIn, signedIn: stillSignedIn, grant: check, needsConsent },
    { headers: { "Cache-Control": "no-store" } },
  );
}
