// Client-only helpers: a small hint (the user's email) that lets the login page
// sign a returning user straight back in with Google. Not a credential: an
// email address can't sign anyone in; Google still decides.

const HINT_KEY = "ewms.signin-hint";
const PING_KEY = "ewms.session-ping";
const AUTO_TRIED_KEY = "ewms.autosignin-tried";
const CONSENT_KEY = "ewms.needs-consent";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    // Private mode or blocked storage: the app works the same, just without the shortcut.
    return fallback;
  }
}

export function rememberSignedInUser(email: string) {
  safe(() => localStorage.setItem(HINT_KEY, email), undefined);
}

export function readSignInHint(): string | null {
  return safe(() => localStorage.getItem(HINT_KEY), null);
}

/** Called on sign-out: the next visit should ask who is signing in. */
export function forgetSignedInUser() {
  safe(() => {
    localStorage.removeItem(HINT_KEY);
    localStorage.removeItem(PING_KEY);
    localStorage.removeItem(CONSENT_KEY);
    sessionStorage.removeItem(AUTO_TRIED_KEY);
  }, undefined);
}

export function lastKeepAlive(): number {
  return safe(() => Number(localStorage.getItem(PING_KEY) ?? 0) || 0, 0);
}

export function markKeepAlive(at = Date.now()) {
  safe(() => localStorage.setItem(PING_KEY, String(at)), undefined);
}

/** Automatic sign-in is tried once per tab, so backing out of Google doesn't loop. */
export function autoSignInAlreadyTried(): boolean {
  return safe(() => sessionStorage.getItem(AUTO_TRIED_KEY) === "1", true);
}

export function markAutoSignInTried() {
  safe(() => sessionStorage.setItem(AUTO_TRIED_KEY, "1"), undefined);
}

/**
 * True when the server holds no Google refresh token for this user, so the next
 * sign-in should ask Google for consent once (which is when it hands one out).
 */
export function setNeedsConsent(needs: boolean) {
  safe(() => {
    if (needs) localStorage.setItem(CONSENT_KEY, "1");
    else localStorage.removeItem(CONSENT_KEY);
  }, undefined);
}

export function needsConsent(): boolean {
  return safe(() => localStorage.getItem(CONSENT_KEY) === "1", false);
}
