import { createServiceClient } from "@/lib/supabase/server";
import { resolveAvatarSrc } from "@/lib/avatar";

/**
 * Resolve a profile avatar URL with priority:
 * 1. profiles.avatar_url
 * 2. Auth Google picture (user_metadata / raw_user_meta_data.picture)
 * 3. null → initials fallback in Avatar
 */
export async function resolveClientAvatarSrc(
  userId: string | null | undefined,
  profileAvatarUrl?: string | null
): Promise<string | null> {
  const fromProfile = resolveAvatarSrc(profileAvatarUrl);
  if (fromProfile) return fromProfile;
  if (!userId) return null;

  try {
    const service = await createServiceClient();
    const { data, error } = await service.auth.admin.getUserById(userId);
    if (error || !data.user) return null;
    return resolveAvatarSrc(null, data.user.user_metadata);
  } catch {
    return null;
  }
}
