import type { UserRole } from "@/types/database";

export type StaffProfile = {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: UserRole;
};

export function staffDisplayName(profile: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const full = profile.full_name?.trim();
  if (full) return full;

  const parts = [profile.first_name, profile.last_name]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (parts.length) return parts.join(" ");

  return profile.email?.trim() || "Unknown user";
}

export function parseStaffRole(value: unknown): UserRole | null {
  if (value === "admin" || value === "client") return value;
  return null;
}

export function sanitizeStaffSearch(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,.()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns an error message if the role change is not allowed. */
export function staffRoleChangeError(input: {
  actorId: string;
  targetId: string;
  currentRole: string;
  nextRole: UserRole;
}): string | null {
  if (input.nextRole === "client" && input.actorId === input.targetId) {
    return "You can't remove your own admin access.";
  }

  if (input.nextRole === "admin" && input.currentRole === "admin") {
    return "This user already has admin access.";
  }

  if (input.nextRole === "client" && input.currentRole !== "admin") {
    return "This user is not an administrator.";
  }

  return null;
}
