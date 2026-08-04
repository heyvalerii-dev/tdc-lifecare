"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";
import { OverlayPortalProvider } from "@/components/floating/overlay-portal-context";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import { cn } from "@/lib/utils";

/**
 * Enter was skipped when <Transition show> wrapped <Dialog>:
 * Transition.beforeEnter sets context.initial=false before Dialog portals its
 * TransitionChildren, so nested children mount already "shown" and never get
 * enterFrom. Leave still worked because those children were already registered.
 *
 * Fix: drive open from <Dialog open>, and use TransitionChild (with appear)
 * inside Dialog so each child is its own transition root bound to Dialog state.
 *
 * Pointer-events / floating UI (root cause of "visible but unclickable" controls):
 * 1. Full-screen shell uses pointer-events-none; the sliding panel restores
 *    pointer-events-auto (Tailwind UI slide-over pattern) so the shell cannot
 *    sit on top of the form as an invisible hit layer.
 * 2. DialogPanel is the full-viewport shell (no transform). The slide animation
 *    transform lives on an inner wrapper only — so FloatingPortal can mount
 *    inside DialogPanel without a transformed containing block breaking
 *    position:fixed, while still counting as "inside" for outside-click and
 *    avoiding body-level inert from useInertOthers.
 */
const BACKDROP_EASE = "ease-out";
const PANEL_EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Small label above the title (e.g. "Block Time"). */
  eyebrow?: string;
  /** Compact badge under the title (e.g. "One-time Block"). */
  badge?: string;
  subtitle?: string;
  /** Extra header control(s) rendered before the close button. */
  headerAction?: ReactNode;
  children: ReactNode;
  /** Custom footer. When omitted, Cancel + primary action are rendered. */
  footer?: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  cancelLabel?: string;
  /** Close when clicking the dimmed backdrop / outside the panel. Default true. */
  closeOnOutsideClick?: boolean;
  /** Desktop panel width. Default ~560px. */
  widthClassName?: string;
  className?: string;
}

export function AppDrawer({
  open,
  onClose,
  title,
  eyebrow,
  badge,
  subtitle,
  headerAction,
  children,
  footer,
  primaryLabel = "Save",
  onPrimary,
  primaryLoading,
  primaryDisabled,
  cancelLabel = "Cancel",
  closeOnOutsideClick = true,
  widthClassName = "sm:max-w-[560px]",
  className,
}: AppDrawerProps) {
  const titleId = useId();
  const subtitleId = useId();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || closeOnOutsideClick) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnOutsideClick, onClose]);

  useEffect(() => {
    if (!open) setPortalRoot(null);
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (closeOnOutsideClick) onClose();
      }}
      className="relative z-[60]"
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
    >
      <OverlayPortalProvider root={portalRoot}>
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

        {/*
          DialogPanel = full-viewport hit container (pointer-events-none).
          Select/DatePicker portal here so they stay inside outside-click bounds
          and inside the dialog stacking context — not under it on document.body.
        */}
        <DialogPanel
          ref={setPortalRoot}
          className="pointer-events-none fixed inset-0 flex justify-end overflow-hidden outline-none"
        >
          <TransitionChild
            appear
            enter={cn("transform transition duration-[240ms]", PANEL_EASE)}
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave={cn("transform transition duration-[220ms]", PANEL_EASE)}
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <div
              className={cn(
                "pointer-events-auto flex h-full w-full flex-col bg-white",
                "shadow-[-12px_0_40px_rgba(93,80,122,0.12)]",
                "will-change-transform",
                widthClassName,
                className
              )}
            >
              <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-[var(--brand-purple)]/[0.08] bg-white px-6 py-5">
                <div className="min-w-0 space-y-1.5">
                  {eyebrow ? (
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--brand-text-muted)]">
                      {eyebrow}
                    </p>
                  ) : null}
                  <DialogTitle
                    id={titleId}
                    className="font-heading text-lg font-semibold tracking-tight text-[var(--brand-text)]"
                  >
                    {title}
                  </DialogTitle>
                  {badge ? (
                    <span className="inline-flex items-center rounded-md border border-[var(--brand-purple)]/15 bg-[var(--brand-purple-light)]/40 px-2 py-0.5 text-[11px] font-medium text-[var(--brand-purple)]">
                      {badge}
                    </span>
                  ) : null}
                  {subtitle && (
                    <p
                      id={subtitleId}
                      className="text-sm leading-relaxed text-[var(--brand-text-muted)]"
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {headerAction}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      "text-[var(--brand-text-muted)] transition-colors duration-150 ease-out",
                      "hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-text)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25"
                    )}
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {children}
              </div>

              <footer className="sticky bottom-0 z-10 shrink-0 border-t border-[var(--brand-purple)]/[0.08] bg-white px-6 py-4">
                {footer ?? (
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={primaryLoading}
                      className={adminSecondaryButtonClass}
                    >
                      {cancelLabel}
                    </button>
                    <button
                      type="button"
                      onClick={onPrimary}
                      disabled={
                        primaryDisabled || primaryLoading || !onPrimary
                      }
                      className={adminPrimaryButtonClass}
                    >
                      {primaryLoading ? "Saving…" : primaryLabel}
                    </button>
                  </div>
                )}
              </footer>
            </div>
          </TransitionChild>
        </DialogPanel>
      </OverlayPortalProvider>
    </Dialog>
  );
}
