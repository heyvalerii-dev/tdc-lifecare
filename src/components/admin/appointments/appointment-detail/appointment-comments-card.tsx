"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailMutedClass,
  detailSectionTitleClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToastMessage } from "@/components/ui/toast-message";
import {
  adminControlInputClass,
  adminControlRadius,
  adminPrimaryButtonClass,
} from "@/lib/admin-controls";
import {
  canEditOrDeleteComment,
  sortCommentsOldestFirst,
  type AppointmentCommentView,
} from "@/lib/appointment-comments";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import {
  formatClinicDate,
  formatClinicTime,
  getClinicToday,
} from "@/lib/datetime";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface AppointmentCommentsCardProps {
  appointmentId: string;
  initialComments: AppointmentCommentView[];
  currentUserId: string;
  currentUserRole: UserRole;
}

type ComposerMode = "create" | "edit";

function formatCommentTimestamp(iso: string): string {
  const dateStr = formatInTimeZone(iso, CLINIC_TIMEZONE, "yyyy-MM-dd");
  const time = formatClinicTime(iso);
  if (dateStr === getClinicToday()) return time;
  return `${formatClinicDate(iso)} · ${time}`;
}

const ghostButtonClass = cn(
  "inline-flex h-9 items-center justify-center rounded-xl px-4 text-sm font-medium",
  "text-[var(--brand-text-muted)] transition-colors duration-150",
  "hover:bg-[var(--brand-purple-light)]/40 hover:text-[var(--brand-text)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export function AppointmentCommentsCard({
  appointmentId,
  initialComments,
  currentUserId,
  currentUserRole,
}: AppointmentCommentsCardProps) {
  const [comments, setComments] = useState(() =>
    sortCommentsOldestFirst(initialComments)
  );
  const [composerMode, setComposerMode] = useState<ComposerMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const listEndRef = useRef<HTMLLIElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setComments(sortCommentsOldestFirst(initialComments));
  }, [initialComments]);

  const ordered = useMemo(
    () => sortCommentsOldestFirst(comments),
    [comments]
  );

  const hasDraft = draft.trim().length > 0;

  const dismissToast = useCallback(() => setToast(null), []);

  function resizeTextarea(node: HTMLTextAreaElement | null = textareaRef.current) {
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.max(node.scrollHeight, 72)}px`;
  }

  useEffect(() => {
    resizeTextarea();
  }, [draft]);

  function resetComposer() {
    setComposerMode("create");
    setEditingId(null);
    setDraft("");
    setError(null);
    requestAnimationFrame(() => resizeTextarea());
  }

  function openEdit(comment: AppointmentCommentView) {
    setComposerMode("edit");
    setEditingId(comment.id);
    setDraft(comment.body);
    setError(null);
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      textareaRef.current?.focus();
      resizeTextarea();
    });
  }

  function handleCancel() {
    if (saving) return;
    resetComposer();
  }

  async function handlePost() {
    if (saving) return;
    const body = draft.trim();
    if (!body) {
      setError("Write a comment before posting.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (composerMode === "edit" && editingId) {
        const res = await fetch(
          `/api/admin/appointments/${appointmentId}/comments/${editingId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          }
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          comment?: AppointmentCommentView;
        };
        if (!res.ok || !data.comment) {
          setError(data.error ?? "Could not update comment.");
          return;
        }
        setComments((prev) =>
          sortCommentsOldestFirst(
            prev.map((c) => (c.id === data.comment!.id ? data.comment! : c))
          )
        );
        resetComposer();
        setToast("Comment updated");
        return;
      }

      const res = await fetch(
        `/api/admin/appointments/${appointmentId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        comment?: AppointmentCommentView;
      };
      if (!res.ok || !data.comment) {
        setError(data.error ?? "Could not post comment.");
        return;
      }

      const next = data.comment;
      setComments((prev) => sortCommentsOldestFirst([...prev, next]));
      resetComposer();
      setToast("Comment posted");
      setHighlightId(next.id);

      requestAnimationFrame(() => {
        listEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    } catch {
      setError("Could not save comment.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId || deletingId) return;
    const id = pendingDeleteId;
    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/appointments/${appointmentId}/comments/${id}`,
        { method: "DELETE" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not delete comment.");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
      setPendingDeleteId(null);
      setToast("Comment deleted");
    } catch {
      setError("Could not delete comment.");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 1600);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const primaryLabel =
    composerMode === "edit"
      ? saving
        ? "Saving…"
        : "Save Changes"
      : saving
        ? "Adding…"
        : "Add Comment";

  return (
    <>
      <section className={detailCardClass}>
        <div className={detailCardHeaderClass}>
          <h2 className={detailSectionTitleClass}>Comments</h2>
        </div>

        <div className={cn(detailCardBodyClass, "space-y-5")}>
          {ordered.length === 0 ? (
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-purple-light)]/35">
                <MessageCircle
                  className="h-5 w-5 text-[var(--brand-purple)]/70"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <div className="space-y-1.5">
                <p className={cn(detailValueClass, "font-medium")}>
                  No comments yet.
                </p>
                <p className={detailMutedClass}>
                  Use comments to communicate appointment updates with other
                  clinic staff.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-0 divide-y divide-[var(--brand-purple)]/[0.08]">
              {ordered.map((comment, index) => {
                const canMutate = canEditOrDeleteComment({
                  authorId: comment.authorId,
                  currentUserId,
                  currentUserRole,
                });
                const isLast = index === ordered.length - 1;

                return (
                  <li
                    key={comment.id}
                    ref={isLast ? listEndRef : undefined}
                    className={cn(
                      "py-4 first:pt-0 last:pb-0 transition-colors duration-300",
                      highlightId === comment.id &&
                        "rounded-lg bg-[var(--brand-purple-light)]/30"
                    )}
                  >
                    {/*
                      Future-ready slots (not implemented):
                      - @mentions in body
                      - file attachments
                      - kind === 'system' event rows
                    */}
                    <div className="flex gap-3.5">
                      <Avatar
                        name={comment.authorName}
                        email={comment.authorEmail}
                        src={comment.authorAvatarUrl}
                        size="md"
                        className="mt-0.5 h-10 w-10 text-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-sm font-semibold leading-snug text-[var(--brand-text)]">
                              {comment.authorName}
                            </p>
                            <p className="truncate text-xs leading-snug text-[var(--brand-text-muted)]">
                              <span>{comment.authorRoleLabel}</span>
                              <span aria-hidden> · </span>
                              <time dateTime={comment.createdAt}>
                                {formatCommentTimestamp(comment.createdAt)}
                                {comment.updatedAt !== comment.createdAt
                                  ? " · Edited"
                                  : ""}
                              </time>
                            </p>
                          </div>
                          {canMutate ? (
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => openEdit(comment)}
                                aria-label="Edit comment"
                                className={cn(
                                  "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                                  "text-[var(--brand-text-muted)] transition-colors duration-150",
                                  "hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25"
                                )}
                              >
                                <Pencil
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(comment.id)}
                                disabled={deletingId === comment.id}
                                aria-label="Delete comment"
                                className={cn(
                                  "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                                  "text-[var(--brand-text-muted)] transition-colors duration-150",
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
                            </div>
                          ) : null}
                        </div>
                        <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--brand-text)]">
                          {comment.body}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div
            ref={composerRef}
            className={cn(
              "space-y-3",
              "border-t border-[var(--brand-purple)]/[0.06] pt-4"
            )}
          >
            <p className="text-sm font-medium text-[var(--brand-text)]">
              {composerMode === "edit" ? "Edit Comment" : "Add Comment"}
            </p>
            <label className="sr-only" htmlFor="appointment-comment-body">
              Comment
            </label>
            <textarea
              ref={textareaRef}
              id="appointment-comment-body"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
                resizeTextarea(e.currentTarget);
              }}
              rows={3}
              disabled={saving}
              placeholder="Add a comment..."
              className={cn(
                adminControlInputClass,
                adminControlRadius,
                "h-auto min-h-[4.5rem] w-full resize-none overflow-hidden px-3 py-2.5 leading-relaxed"
              )}
            />
            {error ? (
              <p role="alert" className="text-sm text-[#8C5C68]">
                {error}
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving || (!hasDraft && composerMode === "create")}
                className={ghostButtonClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handlePost()}
                disabled={saving || !hasDraft}
                className={cn(
                  adminPrimaryButtonClass,
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--brand-purple)]"
                )}
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) setPendingDeleteId(null);
        }}
        title="Delete this comment?"
        description="This cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={Boolean(deletingId)}
        onConfirm={() => void confirmDelete()}
      />

      <ToastMessage message={toast} onDismiss={dismissToast} />
    </>
  );
}
