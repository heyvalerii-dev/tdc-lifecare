"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
import { Download, X } from "lucide-react";
import { OverlayPortalProvider } from "@/components/floating/overlay-portal-context";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import { cn } from "@/lib/utils";

const BACKDROP_EASE = "ease-out";
const PANEL_EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export interface AdminListFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  /** Called when Apply is pressed. Parent should commit draft filters. */
  onApply: () => void;
  onReset?: () => void;
  /** Optional mobile-only export action shown in the sheet footer. */
  onExport?: () => void;
  exportDisabled?: boolean;
  exportLabel?: string;
  applyLabel?: string;
  resetLabel?: string;
}

/**
 * Mobile-first bottom sheet for list filters.
 * Mount filter controls as children; draft state lives in the parent.
 */
export function AdminListFiltersSheet({
  open,
  onOpenChange,
  title = "Filters",
  children,
  onApply,
  onReset,
  onExport,
  exportDisabled,
  exportLabel = "Export CSV",
  applyLabel = "Apply",
  resetLabel = "Reset",
}: AdminListFiltersSheetProps) {
  const titleId = useId();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function close() {
    onOpenChange(false);
  }

  function handleApply() {
    onApply();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      className="relative z-[70]"
      aria-labelledby={titleId}
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

      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
        <TransitionChild
          appear
          enter={cn("transform transition duration-[240ms]", PANEL_EASE)}
          enterFrom="opacity-0 translate-y-full sm:translate-y-2 sm:scale-95"
          enterTo="opacity-100 translate-y-0 sm:scale-100"
          leave={cn("transform transition duration-[180ms]", PANEL_EASE)}
          leaveFrom="opacity-100 translate-y-0 sm:scale-100"
          leaveTo="opacity-0 translate-y-full sm:translate-y-2 sm:scale-95"
        >
          <div className="flex max-h-[min(92dvh,720px)] w-full max-w-lg will-change-transform sm:max-h-[85vh]">
            <DialogPanel
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-t-2xl bg-white outline-none sm:rounded-2xl",
                "shadow-[0_-8px_40px_rgba(93,80,122,0.16)] sm:shadow-[0_16px_48px_rgba(93,80,122,0.18)]",
                "ring-1 ring-[var(--brand-purple)]/[0.08]"
              )}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--brand-purple)]/[0.06] px-5 py-4">
                <DialogTitle
                  id={titleId}
                  className="font-heading text-lg font-semibold tracking-tight text-[var(--brand-text)]"
                >
                  {title}
                </DialogTitle>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close filters"
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                    "text-[var(--brand-text-muted)] transition-colors duration-150",
                    "hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-text)]"
                  )}
                >
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </button>
              </div>

              <div
                ref={setPortalRoot}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
              >
                <OverlayPortalProvider root={portalRoot}>
                  <div className="space-y-5">{children}</div>
                </OverlayPortalProvider>
              </div>

              <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--brand-purple)]/[0.06] px-5 py-4">
                {onExport ? (
                  <button
                    type="button"
                    onClick={onExport}
                    disabled={exportDisabled}
                    className={cn(
                      adminSecondaryButtonClass,
                      "w-full justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                    )}
                  >
                    <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    {exportLabel}
                  </button>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {onReset ? (
                    <button
                      type="button"
                      onClick={onReset}
                      className={cn(adminSecondaryButtonClass, "w-full sm:w-auto")}
                    >
                      {resetLabel}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleApply}
                    className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                  >
                    {applyLabel}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </TransitionChild>
      </div>
    </Dialog>
  );
}

export function AdminListFilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}
