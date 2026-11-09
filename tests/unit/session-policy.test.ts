import { describe, expect, it } from "vitest";
import {
  GRANT_RECHECK_AFTER_MS,
  GRANT_REVOKE_AFTER_MS,
  KEEP_ALIVE_EVERY_MS,
  SESSION_LIFETIME_SECONDS,
  SESSION_REFRESH_SECONDS,
  effectiveFailingSince,
  shouldRevokeAfterFailure,
  shouldVerifyGrant,
} from "@/lib/session-policy";
import { loginErrorMessage } from "@/lib/login-errors";

const NOW = new Date("2026-11-20T06:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("session policy", () => {
  it("keeps sessions for a year and refreshes at most daily", () => {
    expect(SESSION_LIFETIME_SECONDS).toBe(365 * 24 * 60 * 60);
    expect(SESSION_REFRESH_SECONDS).toBe(24 * 60 * 60);
  });

  it("pings more often than the session refreshes, so a used app never lapses", () => {
    expect(KEEP_ALIVE_EVERY_MS).toBeLessThan(SESSION_REFRESH_SECONDS * 1000);
    expect(GRANT_REVOKE_AFTER_MS).toBeGreaterThan(GRANT_RECHECK_AFTER_MS);
  });

  it("re-verifies the Google grant daily, and only with a refresh token", () => {
    expect(shouldVerifyGrant({ hasRefreshToken: true, lastVerifiedAt: ago(2 * HOUR), now: NOW })).toBe(false);
    expect(shouldVerifyGrant({ hasRefreshToken: true, lastVerifiedAt: ago(25 * HOUR), now: NOW })).toBe(true);
    expect(shouldVerifyGrant({ hasRefreshToken: false, lastVerifiedAt: ago(90 * DAY), now: NOW })).toBe(false);
  });

  it("backs off after a refusal too, so Google isn't asked more than daily", () => {
    const base = { hasRefreshToken: true, lastVerifiedAt: ago(30 * DAY), now: NOW };
    expect(shouldVerifyGrant({ ...base, lastAttemptAt: ago(2 * HOUR) })).toBe(false);
    expect(shouldVerifyGrant({ ...base, lastAttemptAt: ago(25 * HOUR) })).toBe(true);
    expect(shouldVerifyGrant({ ...base, lastAttemptAt: null })).toBe(true);
  });

  it("counts a run of refusals from the first one, not from the last success", () => {
    // Away for 40 days, then one refusal: that is the START of a run, not a week of them.
    const failingSince = NOW;
    expect(shouldRevokeAfterFailure({ failingSince, now: NOW })).toBe(false);
    expect(shouldRevokeAfterFailure({ failingSince: ago(6 * DAY), now: NOW })).toBe(false);
    expect(shouldRevokeAfterFailure({ failingSince: ago(7 * DAY), now: NOW })).toBe(true);
    expect(shouldRevokeAfterFailure({ failingSince: ago(40 * DAY), now: NOW })).toBe(true);
  });

  it("ignores refusals recorded before the account was last verified or signed in", () => {
    expect(effectiveFailingSince(null, ago(1 * DAY))).toBeNull();
    expect(effectiveFailingSince(new Date("nonsense"), ago(1 * DAY))).toBeNull();
    // Refused 10 days ago, but the user signed in again 2 days ago: a clean slate.
    expect(effectiveFailingSince(ago(10 * DAY), ago(2 * DAY))).toBeNull();
    // Refused 3 days ago, verified 5 days ago: the run is still going.
    expect(effectiveFailingSince(ago(3 * DAY), ago(5 * DAY))).toEqual(ago(3 * DAY));
  });
});

describe("login error messages", () => {
  it("says nothing when there is no error", () => {
    expect(loginErrorMessage(undefined)).toBeNull();
    expect(loginErrorMessage("")).toBeNull();
  });

  it("explains a cancelled sign-in and an expired link", () => {
    expect(loginErrorMessage("access_denied")).toMatch(/cancelled/i);
    expect(loginErrorMessage("state_mismatch")).toMatch(/expired/i);
    expect(loginErrorMessage("please_restart_the_process")).toMatch(/expired/i);
  });

  it("knows the codes Better Auth really sends", () => {
    for (const code of ["state_invalid", "state_not_found", "state_security_mismatch"]) {
      expect(loginErrorMessage(code)).toMatch(/expired/i);
    }
    for (const code of ["unable_to_link_account", "account_already_linked_to_different_user"]) {
      expect(loginErrorMessage(code)).toMatch(/another sign-in method/i);
    }
  });

  it("falls back to a generic message and never echoes the raw code", () => {
    const msg = loginErrorMessage("<script>weird</script>");
    expect(msg).toMatch(/try again/i);
    expect(msg).not.toContain("script");
  });
});
