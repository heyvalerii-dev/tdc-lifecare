import { getInitialsFromName } from "@/lib/person-utils";

/** Auth metadata shape used for Google / OAuth profile pictures. */
export type AuthAvatarMetadata = {
  picture?: string | null;
  avatar_url?: string | null;
} | null | undefined;

/**
 * Resolve avatar image URL with priority:
 * 1. profiles.avatar_url
 * 2. Auth Google picture (user_metadata / raw_user_meta_data)
 * 3. null → initials fallback in Avatar
 */
export function resolveAvatarSrc(
  profileAvatarUrl?: string | null,
  authMetadata?: AuthAvatarMetadata
): string | null {
  const fromProfile = profileAvatarUrl?.trim();
  if (fromProfile) return fromProfile;

  const fromAuth =
    authMetadata?.avatar_url?.trim() || authMetadata?.picture?.trim();
  if (fromAuth) return fromAuth;

  return null;
}

export function getAvatarInitials(
  name?: string | null,
  email?: string | null
): string {
  const trimmedName = name?.trim();
  if (trimmedName) return getInitialsFromName(trimmedName);

  const trimmedEmail = email?.trim();
  if (trimmedEmail) return trimmedEmail.charAt(0).toUpperCase();

  return "?";
}
