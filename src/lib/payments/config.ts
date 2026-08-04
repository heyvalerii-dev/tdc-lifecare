/**
 * Central payment-mode configuration.
 * Prefer these helpers over reading process.env in call sites.
 *
 * Never export secret keys from this module to client-facing APIs.
 */

let hasLoggedPaymentsMode = false;

/**
 * PayMongo Hosted Checkout is active only when PAYMONGO_ENABLED is exactly "true".
 * Any other value (including unset) keeps Demo Mode.
 */
export function isPayMongoEnabled(): boolean {
  return process.env.PAYMONGO_ENABLED === "true";
}

/**
 * True when the server secret key is a PayMongo test/sandbox key (`sk_test_…`).
 * Does not throw if the key is missing — returns false.
 * Never expose the key itself to the client.
 */
export function isPayMongoSandbox(): boolean {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim() ?? "";
  return key.startsWith("sk_test_");
}

/**
 * True when using live credentials (`sk_live_…`).
 * Does not throw if the key is missing.
 */
export function isPayMongoLiveKeyConfigured(): boolean {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim() ?? "";
  return key.startsWith("sk_live_");
}

/** Safe flags for the browser — no secrets. */
export interface PublicPaymentsConfig {
  paymongoEnabled: boolean;
  paymongoSandbox: boolean;
}

/**
 * Public config for UI badges. Secrets never leave the server.
 * Client should show sandbox UI only when both flags are true.
 */
export function getPublicPaymentsConfig(): PublicPaymentsConfig {
  return {
    paymongoEnabled: isPayMongoEnabled(),
    paymongoSandbox: isPayMongoSandbox(),
  };
}

export function getPaymentsModeLabel(): "PayMongo Enabled" | "Demo Mode" {
  return isPayMongoEnabled() ? "PayMongo Enabled" : "Demo Mode";
}

/** Log the active payments mode once per process (dev-friendly). */
export function logPaymentsModeOnce(): void {
  if (hasLoggedPaymentsMode) return;
  hasLoggedPaymentsMode = true;

  if (process.env.NODE_ENV === "development") {
    const sandbox =
      isPayMongoEnabled() && isPayMongoSandbox()
        ? " (sandbox)"
        : isPayMongoEnabled() && isPayMongoLiveKeyConfigured()
          ? " (live)"
          : "";
    console.info(`Payments: ${getPaymentsModeLabel()}${sandbox}`);
  }
}
