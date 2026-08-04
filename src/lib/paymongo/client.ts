/**
 * Shared PayMongo HTTP client helpers.
 * Secret keys never leave the server.
 */

const PAYMONGO_API_URL = "https://api.paymongo.com/v1";

export class PaymongoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymongoConfigError";
  }
}

export function getPaymongoSecretKey(): string {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim();
  if (!key) {
    throw new PaymongoConfigError(
      "PAYMONGO_SECRET_KEY is not configured. Add it to your environment."
    );
  }
  return key;
}

export function getPaymongoWebhookSecret(): string {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new PaymongoConfigError(
      "PAYMONGO_WEBHOOK_SECRET is not configured. Add it to your environment."
    );
  }
  return secret;
}

export function assertPaymongoConfigured(): void {
  getPaymongoSecretKey();
  getPaymongoWebhookSecret();
}

export function isPaymongoLiveMode(secretKey = getPaymongoSecretKey()): boolean {
  return secretKey.startsWith("sk_live_");
}

export function paymongoAuthHeader(secretKey = getPaymongoSecretKey()): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export function paymongoApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PAYMONGO_API_URL}${normalized}`;
}
