import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") ?? "/client/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const picture =
          (typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null) ||
          (typeof user.user_metadata?.picture === "string"
            ? user.user_metadata.picture
            : null);

        if (picture) {
          // Keep profiles.avatar_url in sync with OAuth picture when missing.
          // Header already falls back to user_metadata; staff notes do not.
          await supabase
            .from("profiles")
            .update({ avatar_url: picture })
            .eq("id", user.id)
            .or("avatar_url.is.null,avatar_url.eq.");
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const destination =
          profile?.role === "admin" ? "/admin/dashboard" : redirect;
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
