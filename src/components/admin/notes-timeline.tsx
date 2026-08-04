"use client";

import { useMemo, useState } from "react";
import { Trash2, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailMutedClass,
  detailSectionTitleClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import {
  adminControlInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-controls";
import { formatClinicDate, formatClinicTime } from "@/lib/datetime";
import {
  sortNotesNewestFirst,
  type TimelineNote,
} from "@/lib/staff-notes";
import { cn } from "@/lib/utils";

export type { TimelineNote };

export interface NotesTimelineProps {
  notes: TimelineNote[];
  /** When provided, shows the always-visible note composer. */
  onAdd?: (body: string) => Promise<void>;
  /** Future: admin-only delete. When omitted, delete is hidden. */
  onDelete?: (id: string) => Promise<void>;
  canDelete?: boolean;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

function formatNoteTimestamp(iso: string): string {
  return `${formatClinicDate(iso)} • ${formatClinicTime(iso)}`;
}

export function NotesTimeline({
  notes,
  onAdd,
  onDelete,
  canDelete = false,
  title = "Staff Notes",
  emptyTitle = "No notes yet",
  emptyDescription = "Add a note to keep the team informed.",
  className,
}: NotesTimelineProps) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const ordered = useMemo(() => sortNotesNewestFirst(notes), [notes]);
  const hasDraft = draft.trim().length > 0;
  const showClear = draft.length > 0;
  const deleteConfirmOpen = pendingDeleteId !== null;

  async function handleAdd() {
    if (!onAdd || saving) return;
    const body = draft.trim();
    if (!body) {
      setError("Write a note before adding.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onAdd(body);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add note");
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setDraft("");
    setError(null);
  }

  function requestDelete(id: string) {
    if (!onDelete || !canDelete || deletingId) return;
    setPendingDeleteId(id);
  }

  async function confirmDelete() {
    if (!onDelete || !canDelete || !pendingDeleteId || deletingId) return;

    const id = pendingDeleteId;
    setDeletingId(id);
    setError(null);
    try {
      await onDelete(id);
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete note");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className={cn(detailCardClass, className)}>
        <div className={detailCardHeaderClass}>
          <h2 className={detailSectionTitleClass}>{title}</h2>
        </div>

        <div className={cn(detailCardBodyClass, "space-y-5")}>
          {ordered.length === 0 ? (
            <div className="space-y-1.5">
              <p className={cn(detailValueClass, "font-medium")}>{emptyTitle}</p>
              <p className={detailMutedClass}>{emptyDescription}</p>
            </div>
          ) : (
            <ul className="space-y-0 divide-y divide-[var(--brand-purple)]/[0.08]">
              {ordered.map((note) => (
                <li key={note.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex gap-4">
                    <Avatar
                      name={note.author.name}
                      email={note.author.email}
                      src={note.author.avatarUrl}
                      size="md"
                      className="mt-0.5 h-10 w-10 text-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold leading-snug text-[var(--brand-text)]">
                            {note.author.name}
                          </p>
                          <p className="text-xs leading-snug text-[var(--brand-text-muted)]">
                            {formatNoteTimestamp(note.createdAt)}
                          </p>
                        </div>
                        {canDelete && onDelete && (
                          <span className="group relative shrink-0">
                            <button
                              type="button"
                              onClick={() => requestDelete(note.id)}
                              disabled={deletingId === note.id}
                              aria-label="Delete note"
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                                "text-[var(--brand-text-muted)] transition-colors duration-150 ease-out",
                                "hover:bg-[#F8EEF0] hover:text-[#8C5C68]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
                                "disabled:cursor-not-allowed disabled:opacity-50"
                              )}
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            </button>
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 whitespace-nowrap rounded-lg border border-[#E8E2F2] bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-[var(--brand-text)] opacity-0 shadow-[0_8px_24px_rgba(93,80,122,0.12)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                            >
                              Delete note
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--brand-text)]">
                        {note.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {onAdd && (
            <div
              className={cn(
                "space-y-3",
                ordered.length > 0 &&
                  "border-t border-[var(--brand-purple)]/[0.06] pt-4"
              )}
            >
              <div className="relative">
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (error) setError(null);
                  }}
                  rows={3}
                  disabled={saving}
                  placeholder="Write a note for the team..."
                  aria-label="Staff note"
                  className={cn(
                    adminControlInputClass,
                    "h-auto w-full resize-y px-3 py-2",
                    showClear && "pr-9"
                  )}
                />
                {showClear && (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={saving}
                    aria-label="Clear note"
                    className={cn(
                      "absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md",
                      "text-[var(--brand-text-muted)] transition-colors duration-150",
                      "hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-text)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  </button>
                )}
              </div>
              {error && <p className="text-sm text-[#8C5C68]">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={saving || !hasDraft}
                  className={adminPrimaryButtonClass}
                >
                  {saving ? "Adding…" : "Add Note"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !deletingId) setPendingDeleteId(null);
        }}
        title="Delete this note?"
        description="This cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={Boolean(deletingId)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
