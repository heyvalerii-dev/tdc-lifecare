import type {
  AppointmentComment,
  AppointmentCommentKind,
  AppointmentCommentWithAuthor,
  UserRole,
} from "@/types/database";

export const APPOINTMENT_COMMENT_AUTHOR_SELECT = `
  *,
  author:profiles!author_id(
    id,
    full_name,
    email,
    avatar_url,
    role
  )
`;

/** Staff-facing role labels for comment headers. */
export const COMMENT_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  secretary: "Secretary",
  psychologist: "Psychologist",
  client: "Client",
};

export function commentRoleLabel(role: string | null | undefined): string {
  if (!role) return "Staff";
  return COMMENT_ROLE_LABELS[role] ?? role;
}

/** UI-facing comment shape (chronological collaboration feed). */
export interface AppointmentCommentView {
  id: string;
  appointmentId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorRoleLabel: string;
  authorEmail: string | null;
  authorAvatarUrl: string | null;
  body: string;
  kind: AppointmentCommentKind;
  createdAt: string;
  updatedAt: string;
}

function normalizeAuthor(
  author:
    | AppointmentCommentWithAuthor["author"]
    | AppointmentCommentWithAuthor["author"][]
    | null
): AppointmentCommentWithAuthor["author"] {
  if (!author) return null;
  return Array.isArray(author) ? author[0] ?? null : author;
}

export function toAppointmentCommentView(
  row: AppointmentComment | AppointmentCommentWithAuthor,
  avatarOverrides?: Map<string, string>
): AppointmentCommentView {
  const withAuthor = row as AppointmentCommentWithAuthor;
  const author = normalizeAuthor(withAuthor.author ?? null);
  const authorId = author?.id ?? row.author_id;
  const fromProfile = author?.avatar_url?.trim() || null;
  const fromOverride = avatarOverrides?.get(authorId)?.trim() || null;

  return {
    id: row.id,
    appointmentId: row.appointment_id,
    authorId,
    authorName:
      row.author_name?.trim() ||
      author?.full_name?.trim() ||
      author?.email?.trim() ||
      "Staff",
    authorRole: row.author_role,
    authorRoleLabel: commentRoleLabel(row.author_role),
    authorEmail: author?.email ?? null,
    authorAvatarUrl: fromProfile || fromOverride || null,
    body: row.body,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sortCommentsOldestFirst(
  comments: AppointmentCommentView[]
): AppointmentCommentView[] {
  return [...comments].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      a.id.localeCompare(b.id)
  );
}

export function canEditOrDeleteComment(args: {
  authorId: string;
  currentUserId: string;
  currentUserRole: UserRole | string;
}): boolean {
  if (args.currentUserRole === "admin") return true;
  return args.authorId === args.currentUserId;
}

export function resolveAuthorDisplayName(profile: {
  full_name?: string | null;
  email?: string | null;
}): string {
  return profile.full_name?.trim() || profile.email?.trim() || "Staff";
}
