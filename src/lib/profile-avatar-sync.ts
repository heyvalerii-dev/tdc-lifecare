import type { SupabaseClient } from "@supabase/supabase-js";

function pictureFromAuthMetadata(
  metadata: Record<string, unknown> | undefined
): string | null {
  if (!metadata) return null;
  const avatarUrl = metadata.avatar_url;
  const picture = metadata.picture;
  if (typeof avatarUrl === "string" && avatarUrl.trim()) return avatarUrl.trim();
  if (typeof picture === "string" && picture.trim()) return picture.trim();
  return null;
}

/**
 * Ensure `profiles.avatar_url` is populated when Auth has a Google/OAuth picture
 * but the profile row was never updated (common for admins who only see their
 * photo in the header via user_metadata fallback).
 *
 * Returns a map of profileId → avatar URL for callers that need immediate use.
 */
export async function syncMissingProfileAvatars(
  service: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const unique = [...new Set(profileIds.filter(Boolean))];
  if (unique.length === 0) return resolved;

  const { data: profiles } = await service
    .from("profiles")
    .select("id, avatar_url")
    .in("id", unique);

  for (const profile of profiles ?? []) {
    const existing = profile.avatar_url?.trim();
    if (existing) {
      resolved.set(profile.id, existing);
      continue;
    }

    const { data: authData, error } = await service.auth.admin.getUserById(
      profile.id
    );
    if (error || !authData.user) continue;

    const picture = pictureFromAuthMetadata(
      authData.user.user_metadata as Record<string, unknown> | undefined
    );
    if (!picture) continue;

    await service
      .from("profiles")
      .update({
        avatar_url: picture,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .or("avatar_url.is.null,avatar_url.eq.");

    // Always expose Auth picture for this response so notes render correctly.
    resolved.set(profile.id, picture);
  }

  return resolved;
}
