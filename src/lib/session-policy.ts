// Session lifetime and the Google re-check schedule. Plain constants and pure
// decisions, shared by the auth config, the keep-alive route and the tests.

const DAY = 60 * 60 * 24;

/** A session lasts this long after its last refresh. */
export const SESSION_LIFETIME_SECONDS = 365 * DAY;

/** At most once this often a session is refreshed (expiry and cookie pushed out again). */
export const SESSION_REFRESH_SECONDS = DAY;

/** How often the app pings the server while it is open (milliseconds). */
export const KEEP_ALIVE_EVERY_MS = 6 * 60 * 60 * 1000;

/** Re-verify the Google grant at most this often. */
export const GRANT_RECHECK_AFTER_MS = DAY * 1000;

/**
 * If Google keeps refusing for this long (counted from the FIRST refusal, not
 * from the last success), treat the grant as revoked and end the user's
 * sessions. Shorter outages (Google down, network) never sign anyone out.
 */
export const GRANT_REVOKE_AFTER_MS = 7 * DAY * 1000;

export function shouldVerifyGrant(input: {
  hasRefreshToken: boolean;
  /** When Google last accepted this account's refresh token (or the user last signed in). */
  lastVerifiedAt: Date;
  /** When we last asked and Google refused; failures back off like successes. */
  lastAttemptAt?: Date | null;
  now?: Date;
}): boolean {
  if (!input.hasRefreshToken) return false;
  const now = input.now ?? new Date();
  const last = Math.max(input.lastVerifiedAt.getTime(), input.lastAttemptAt?.getTime() ?? 0);
  return now.getTime() - last >= GRANT_RECHECK_AFTER_MS;
}

/**
 * When the current run of refusals began, or null if there is none. A refusal
 * recorded before the account was last verified or signed in again is history.
 */
export function effectiveFailingSince(
  failingSince: Date | null | undefined,
  lastVerifiedAt: Date,
): Date | null {
  if (!failingSince || Number.isNaN(failingSince.getTime())) return null;
  return failingSince.getTime() > lastVerifiedAt.getTime() ? failingSince : null;
}

/** After a refusal: only a week-long run of them counts as a revoked grant. */
export function shouldRevokeAfterFailure(input: { failingSince: Date; now?: Date }): boolean {
  const now = input.now ?? new Date();
  return now.getTime() - input.failingSince.getTime() >= GRANT_REVOKE_AFTER_MS;
}
