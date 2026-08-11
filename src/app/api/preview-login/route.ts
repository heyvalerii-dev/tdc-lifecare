import { NextResponse } from "next/server";
import {
  SITE_ACCESS_COOKIE,
  deriveSiteAccessToken,
  isSitePasswordEnabled,
  safeRedirectPath,
  timingSafeEqualString,
} from "@/lib/site-password";

export async function POST(request: Request) {
  if (!isSitePasswordEnabled()) {
    return NextResponse.json({ ok: true, redirect: "/" });
  }

  let body: { password?: string; redirect?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const submitted = typeof body.password === "string" ? body.password : "";
  const expectedPassword = process.env.SITE_PASSWORD ?? "";

  // Compare derived tokens (fixed length) to avoid leaking password length via timing.
  const [submittedToken, expectedToken] = await Promise.all([
    deriveSiteAccessToken(submitted),
    deriveSiteAccessToken(expectedPassword),
  ]);

  if (!timingSafeEqualString(submittedToken, expectedToken)) {
    return NextResponse.json(
      { error: "Incorrect password. Please try again." },
      { status: 401 }
    );
  }

  const redirect = safeRedirectPath(body.redirect);
  const response = NextResponse.json({ ok: true, redirect });

  response.cookies.set(SITE_ACCESS_COOKIE, expectedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Session cookie — cleared when the browser session ends.
  });

  return response;
}
