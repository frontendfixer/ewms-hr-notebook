/**
 * Better Auth sends a failed or cancelled sign-in back to /login with
 * `?error=<code>`. Say something useful for the common ones.
 */
export function loginErrorMessage(code: string | undefined | null): string | null {
  if (!code) return null;
  switch (code) {
    case "access_denied":
      return "Sign-in was cancelled. Choose a Google account to continue.";
    case "state_mismatch":
    case "state_not_found":
    case "state_invalid":
    case "state_security_mismatch":
    case "invalid_state":
    case "please_restart_the_process":
      return "That sign-in link expired. Please try again.";
    case "account_not_linked":
    case "unable_to_link_account":
    case "account_already_linked_to_different_user":
      return "This email is already used with another sign-in method.";
    default:
      return "Sign-in didn’t complete. Please try again.";
  }
}
