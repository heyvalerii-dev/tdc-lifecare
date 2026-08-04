import type {
  StaffNoteEntityType,
  StaffNoteWithAuthor,
} from "@/types/database";

export const STAFF_NOTE_ENTITY_TYPES: StaffNoteEntityType[] = [
  "client",
  "appointment",
  "psychologist",
  "payment",
];

/** Prefer explicit FK column — avoids brittle auto-generated constraint names. */
export const STAFF_NOTE_AUTHOR_SELECT = `
  *,
  author:profiles!author_id(
    id,
    full_name,
    email,
    avatar_url
  )
`;

export function isStaffNoteEntityType(
  value: unknown
): value is StaffNoteEntityType {
  return (
    typeof value === "string" &&
    STAFF_NOTE_ENTITY_TYPES.includes(value as StaffNoteEntityType)
  );
}

/** UI-facing note shape for NotesTimeline. */
export interface TimelineNote {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  };
}

function normalizeAuthor(
  author: StaffNoteWithAuthor["author"] | StaffNoteWithAuthor["author"][] | null
): StaffNoteWithAuthor["author"] {
  if (!author) return null;
  return Array.isArray(author) ? author[0] ?? null : author;
}

export function toTimelineNote(
  note: StaffNoteWithAuthor,
  avatarOverrides?: Map<string, string>
): TimelineNote {
  const author = normalizeAuthor(note.author);
  const authorId = author?.id ?? note.author_id;
  const name =
    author?.full_name?.trim() || author?.email?.trim() || "Staff";

  const fromProfile = author?.avatar_url?.trim() || null;
  const fromOverride = avatarOverrides?.get(authorId)?.trim() || null;

  return {
    id: note.id,
    body: note.body,
    createdAt: note.created_at,
    author: {
      id: authorId,
      name,
      email: author?.email ?? null,
      // Author profile only — never the client entity's avatar.
      avatarUrl: fromProfile || fromOverride || null,
    },
  };
}

export function sortNotesNewestFirst(notes: TimelineNote[]): TimelineNote[] {
  return [...notes].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
