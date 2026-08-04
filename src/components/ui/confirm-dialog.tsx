"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import { cn } from "@/lib/utils";

const BACKDROP_EASE = "ease-out";
const PANEL_EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

const adminDestructiveButtonClass = cn(
  "inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-medium",
  "rounded-xl transition-colors duration-150 ease-out",
  "bg-[#B85C6A] text-white hover:bg-[#A04E5B]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B85C6A]/30 focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Optional body content below the description (e.g. radio choices). */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Drive open from <Dialog open> and animate with TransitionChild (appear),
 * matching AppDrawer — wrapping Dialog in Transition skips enterFrom.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const confirmingRef = useRef(false);
  const loadingRef = useRef(loading);
  const onConfirmRef = useRef(onConfirm);

  loadingRef.current = loading;
  onConfirmRef.current = onConfirm;

  const resolvedConfirmLabel =
    confirmLabel ?? (variant === "destructive" ? "Delete" : "Confirm");

  function close() {
    if (loading) return;
    onOpenChange(false);
  }

  async function handleConfirm() {
    if (loadingRef.current || confirmingRef.current) return;
    confirmingRef.current = true;
    try {
      await onConfirmRef.current();
    } finally {
      confirmingRef.current = false;
    }
  }

  // Enter confirms when focus isn't already on a button (those activate natively).
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.defaultPrevented || loadingRef.current) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, [contenteditable='true']")) return;
      if (target?.tagName === "BUTTON") return;

      event.preventDefault();
      void handleConfirm();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loading) onOpenChange(false);
      }}
      className="relative z-[70]"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      initialFocus={confirmRef}
    >
      <TransitionChild
        appear
        enter={cn(
          "transition-[opacity,backdrop-filter] duration-[180ms]",
          BACKDROP_EASE
        )}
        enterFrom="opacity-0 backdrop-blur-[0px]"
        enterTo="opacity-100 backdrop-blur-[4px]"
        leave={cn(
          "transition-[opacity,backdrop-filter] duration-[180ms]",
          BACKDROP_EASE
        )}
        leaveFrom="opacity-100 backdrop-blur-[4px]"
        leaveTo="opacity-0 backdrop-blur-[0px]"
      >
        <div
          className="fixed inset-0 bg-[var(--brand-text)]/35"
          aria-hidden
        />
      </TransitionChild>

      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center sm:p-6">
        <TransitionChild
          appear
          enter={cn("transform transition duration-[220ms]", PANEL_EASE)}
          enterFrom="opacity-0 scale-95 translate-y-2 sm:translate-y-0"
          enterTo="opacity-100 scale-100 translate-y-0"
          leave={cn("transform transition duration-[160ms]", PANEL_EASE)}
          leaveFrom="opacity-100 scale-100 translate-y-0"
          leaveTo="opacity-0 scale-95 translate-y-2 sm:translate-y-0"
        >
          <div className="w-full max-w-[440px] will-change-transform">
            <DialogPanel
              className={cn(
                "w-full rounded-xl bg-white outline-none",
                "shadow-[0_16px_48px_rgba(93,80,122,0.18)]",
                "ring-1 ring-[var(--brand-purple)]/[0.08]"
              )}
            >
              <div className="space-y-2 px-6 pt-6 pb-4">
                <DialogTitle
                  id={titleId}
                  className="font-heading text-lg font-semibold tracking-tight text-[var(--brand-text)]"
                >
                  {title}
                </DialogTitle>
                {description ? (
                  <Description
                    id={descriptionId}
                    className="text-sm leading-relaxed text-[var(--brand-text-muted)]"
                  >
                    {description}
                  </Description>
                ) : null}
                {children ? <div className="pt-1">{children}</div> : null}
              </div>

              <div className="flex flex-col-reverse gap-3 px-6 pb-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={loading}
                  className={cn(adminSecondaryButtonClass, "w-full sm:w-auto")}
                >
                  {cancelLabel}
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={loading}
                  className={cn(
                    variant === "destructive"
                      ? adminDestructiveButtonClass
                      : adminPrimaryButtonClass,
                    "w-full sm:w-auto"
                  )}
                >
                  {loading
                    ? variant === "destructive"
                      ? "Deleting…"
                      : "Working…"
                    : resolvedConfirmLabel}
                </button>
              </div>
            </DialogPanel>
          </div>
        </TransitionChild>
      </div>
    </Dialog>
  );
}
