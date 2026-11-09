import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  effectiveFailingSince,
  shouldRevokeAfterFailure,
  shouldVerifyGrant,
} from "@/lib/session-policy";

export type GrantCheck = "skipped" | "verified" | "failed" | "revoked";

/** When Google first refused this user's refresh token (ISO date), kept in user settings. */
const FAILING_SINCE_KEY = "googleGrantFailingSince";

/**
 * Asks Google, with the stored refresh token, whether the user still allows
 * this app, and gets a fresh access token while at it. At most daily per
 * account, failures included.
 *
 * A refusal is not fatal on its own: Google or the network may be down, or the
 * app's credentials misconfigured. The first refusal is only recorded; sessions
 * end only when refusals have gone on for a week (and each of them was a real
 * attempt, a day apart).
 *
 * `needsConsent` is true when no refresh token is stored (people who signed in
 * before it was requested), so the login page can ask for it next time.
 */
export async function revalidateGoogleGrant(
  userId: string,
): Promise<{ check: GrantCheck; needsConsent: boolean }> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
    select: { id: true, refreshToken: true, updatedAt: true },
  });
  if (!account) return { check: "skipped", needsConsent: false };
  const needsConsent = !account.refreshToken;

  const failing = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: FAILING_SINCE_KEY } },
  });
  if (
    !shouldVerifyGrant({
      hasRefreshToken: !needsConsent,
      lastVerifiedAt: account.updatedAt,
      lastAttemptAt: failing?.updatedAt,
    })
  ) {
    return { check: "skipped", needsConsent };
  }

  try {
    // Server-side call: refreshes the Google access token and stores the new tokens.
    await auth.api.refreshToken({ body: { accountId: account.id, userId } });
    // Record that Google accepted the token now, and clear any run of refusals.
    await prisma.account.update({ where: { id: account.id }, data: { updatedAt: new Date() } });
    await prisma.userSetting.deleteMany({ where: { userId, key: FAILING_SINCE_KEY } });
    return { check: "verified", needsConsent };
  } catch {
    const failingSince =
      effectiveFailingSince(failing ? new Date(failing.value) : null, account.updatedAt) ??
      new Date();
    if (shouldRevokeAfterFailure({ failingSince })) {
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.userSetting.deleteMany({ where: { userId, key: FAILING_SINCE_KEY } });
      return { check: "revoked", needsConsent };
    }
    // Upsert also bumps updatedAt, which is what spaces the retries a day apart.
    await prisma.userSetting.upsert({
      where: { userId_key: { userId, key: FAILING_SINCE_KEY } },
      create: { userId, key: FAILING_SINCE_KEY, value: failingSince.toISOString() },
      update: { value: failingSince.toISOString() },
    });
    return { check: "failed", needsConsent };
  }
}
