import { type NextRequest } from "next/server";

/** httpOnly cookie set after the visitor passes the site-password gate. */
export const SITE_ACCESS_COOKIE = "tdc_site_access";

/**
 * Paths that must remain reachable without the site-password cookie.
 * Keep this list minimal — only server-to-server and the gate itself.
 */
export function isSitePasswordExemptPath(pathname: string): boolean {
  if (pathname === "/preview-login") return true;
  if (pathname === "/api/preview-login") return true;
  // PayMongo server → app (no browser cookie)
  if (pathname.startsWith("/api/webhooks/")) return true;
  // Vercel / external cron with Bearer CRON_SECRET
  if (pathname.startsWith("/api/cron/")) return true;
  return false;
}

export function isSitePasswordEnabled(): boolean {
  const password = process.env.SITE_PASSWORD;
  return typeof password === "string" && password.length > 0;
}

/** Derive a token from the site password — never store the password in the cookie. */
export async function deriveSiteAccessToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`tdc-lifecare:site-access:v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(digest);
}

export async function getExpectedSiteAccessToken(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return deriveSiteAccessToken(password);
}

export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function hasValidSiteAccess(request: NextRequest): Promise<boolean> {
  const expected = await getExpectedSiteAccessToken();
  if (!expected) return true;

  const cookie = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  if (!cookie) return false;

  return timingSafeEqualString(cookie, expected);
}

/** Only allow relative in-app redirects (no open redirects). */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.startsWith("/preview-login")) return "/";
  return raw;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
