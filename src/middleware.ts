import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  hasValidSiteAccess,
  isSitePasswordEnabled,
  isSitePasswordExemptPath,
  safeRedirectPath,
} from "@/lib/site-password";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Shared site-password gate (MVP deployment). Runs before Supabase session logic.
  // When SITE_PASSWORD is unset, the gate is disabled (local dev default).
  if (isSitePasswordEnabled() && !isSitePasswordExemptPath(path)) {
    const allowed = await hasValidSiteAccess(request);

    if (!allowed) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = request.nextUrl.clone();
      const redirectTarget = `${path}${request.nextUrl.search}`;
      url.pathname = "/preview-login";
      url.search = "";
      url.searchParams.set("redirect", redirectTarget);
      return NextResponse.redirect(url);
    }
  }

  // Already unlocked visitors who revisit the gate go into the app.
  if (
    isSitePasswordEnabled() &&
    path === "/preview-login" &&
    (await hasValidSiteAccess(request))
  ) {
    const redirect = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));
    const url = request.nextUrl.clone();
    const qIndex = redirect.indexOf("?");
    if (qIndex === -1) {
      url.pathname = redirect;
      url.search = "";
    } else {
      url.pathname = redirect.slice(0, qIndex);
      url.search = redirect.slice(qIndex);
    }
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
