/** Map Supabase / auth API errors to calm, user-friendly copy. */
export function formatAuthError(message: string): string {
  const normalized = message.toLowerCase().trim();

  if (
    normalized.includes("rate limit") ||
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("email rate limit")
  ) {
    if (
      normalized.includes("password") ||
      normalized.includes("reset") ||
      normalized.includes("recovery")
    ) {
      return "You've requested several reset emails recently. Please try again in about a minute.";
    }
    return "Please wait a moment before requesting another email.";
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "That email or password doesn't look right. Please check your details and try again.";
  }

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("email not verified")
  ) {
    return "Please confirm your email before signing in. Check your inbox for a confirmation link.";
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already exists")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (
    normalized.includes("password") &&
    (normalized.includes("at least") || normalized.includes("short") || normalized.includes("weak"))
  ) {
    return "Please choose a password that's at least 8 characters long.";
  }

  if (normalized.includes("invalid email") || normalized.includes("valid email")) {
    return "Please enter a valid email address.";
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("invalid or has expired") ||
    normalized.includes("otp_expired")
  ) {
    return "This link has expired. Please request a new one.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "We couldn't reach our servers. Please check your connection and try again.";
  }

  if (normalized.includes("signup") && normalized.includes("disabled")) {
    return "New account registration is temporarily unavailable. Please contact the clinic for help.";
  }

  // Friendly fallbacks for common short messages we set in-app
  if (normalized === "enter your email above, then try again.") {
    return "Enter your email above, then try again.";
  }

  // Default: avoid exposing raw technical strings when they look like system errors
  if (
    normalized.includes("_") ||
    normalized.includes("error code") ||
    normalized.length > 120
  ) {
    return "Something didn't work as expected. Please try again in a moment.";
  }

  return message;
}

/** Whether an error warrants stronger critical styling (rare). */
export function isCriticalAuthError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("signup") && normalized.includes("disabled") ||
    normalized.includes("service unavailable") ||
    normalized.includes("internal server")
  );
}
