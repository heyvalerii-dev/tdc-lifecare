"use client";

import { useCallback, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
import { Lock } from "lucide-react";
import { CalendarEventPreview } from "@/components/admin/appointments/calendar-appointment-preview";
import { useCalendarDrawer } from "@/components/admin/manual-booking/manual-booking-context";
import {
  HOVER_CARD_CLOSE_DELAY_MS,
  useFloatingHoverCard,
} from "@/components/floating";
import {
  CALENDAR_EVENT_RADIUS_CLASS,
  CALENDAR_TRANSITION_CLASS,
  getBlockGridPosition,
} from "@/lib/admin-calendar";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import {
  blockDisplayTitle,
  getMultiDaySegmentKind,
  multiDaySegmentLabel,
} from "@/lib/calendar-blocks";
import { UNAVAILABLE_REASON_LABELS } from "@/lib/constants";
import { formatClinicTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { UnavailableBlock } from "@/types/database";

const PREVIEW_HIDE_DELAY_MS = HOVER_CARD_CLOSE_DELAY_MS;

interface CalendarBlockedTimeEventProps {
  block: UnavailableBlock;
  /** Clipped segment for this calendar day (may differ for multi-day overrides). */
  displayStartAt?: string;
  displayEndAt?: string;
  dateStr: string;
  psychologistName: string;
  gridStartMinutes?: number;
  gridEndMinutes?: number;
  slotHeightPx?: number;
  variant?: "desktop" | "mobile";
}

export function CalendarBlockedTimeEvent({
  block,
  displayStartAt,
  displayEndAt,
  dateStr,
  psychologistName,
  gridStartMinutes,
  gridEndMinutes,
  slotHeightPx,
  variant = "desktop",
}: CalendarBlockedTimeEventProps) {
  const { openBlockTime } = useCalendarDrawer();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  const { popover, setReference } = useFloatingHoverCard({
    open: previewOpen,
    variant: "calendar-preview",
  });

  const segmentStart = displayStartAt ?? block.start_at;
  const segmentEnd = displayEndAt ?? block.end_at;

  const position = getBlockGridPosition(
    segmentStart,
    segmentEnd,
    dateStr,
    gridStartMinutes,
    gridEndMinutes,
    slotHeightPx
  );

  const isRecurring = block.layer === "rule";
  const segmentKind = getMultiDaySegmentKind(
    block.start_at,
    block.end_at,
    dateStr
  );

  const showPreview = useCallback(() => {
    if (chooserOpen) return;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setPreviewOpen(true);
  }, [chooserOpen]);

  const hidePreview = useCallback(() => {
    hideTimerRef.current = setTimeout(() => {
      setPreviewOpen(false);
    }, PREVIEW_HIDE_DELAY_MS);
  }, []);

  function handleClick() {
    setPreviewOpen(false);
    if (isRecurring) {
      setChooserOpen(true);
      return;
    }
    openBlockTime({ block });
  }

  function editRecurring() {
    setChooserOpen(false);
    openBlockTime({ block });
  }

  function createOneTimeOverride() {
    setChooserOpen(false);
    openBlockTime({
      overrideFromRule: { rule: block, dateStr },
    });
  }

  if (!position) return null;

  const baseTitle = blockDisplayTitle(
    block.reason,
    block.title,
    UNAVAILABLE_REASON_LABELS
  );
  const title = multiDaySegmentLabel(baseTitle, segmentKind);
  const occurrenceDateLabel = format(
    parseISO(`${dateStr}T12:00:00`),
    "MMM d, yyyy"
  );

  const timeLabel =
    block.all_day || segmentKind !== "single"
      ? segmentKind === "single" && block.all_day
        ? "All day"
        : segmentKind === "start"
          ? "Starts"
          : segmentKind === "end"
            ? "Ends"
            : "Continues"
      : `${formatClinicTime(segmentStart)}–${formatClinicTime(segmentEnd)}`;

  const isMobile = variant === "mobile";
  const isCompactBlock =
    isMobile &&
    (block.reason === "lunch_break" || position.sessionHeightPx <= 56);
  const showBlockTime = isMobile && !isCompactBlock;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[9] flex flex-col",
        isMobile ? "inset-x-1.5" : "inset-x-1"
      )}
      style={{
        top: position.topPx,
        height: position.sessionHeightPx,
      }}
    >
      <button
        type="button"
        ref={setReference}
        onClick={handleClick}
        onMouseEnter={showPreview}
        onMouseLeave={hidePreview}
        onFocus={showPreview}
        onBlur={hidePreview}
        className={cn(
          "pointer-events-auto relative flex min-w-0 flex-col overflow-hidden border border-[#D8D4DE] text-left",
          isMobile
            ? isCompactBlock
              ? "justify-center gap-0 px-2.5 py-1"
              : "justify-center gap-0 px-3 py-1.5"
            : "justify-center px-3 py-1.5",
          CALENDAR_EVENT_RADIUS_CLASS,
          CALENDAR_TRANSITION_CLASS,
          "bg-[#F3F1F5]",
          "[background-image:repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(93,80,122,0.06)_4px,rgba(93,80,122,0.06)_8px)]",
          "hover:-translate-y-px hover:border-[#C8C2D4] hover:shadow-[0_3px_8px_rgba(93,80,122,0.08)] active:scale-[0.995]",
          isMobile && "self-start"
        )}
        style={
          isMobile
            ? {
                maxHeight: position.sessionHeightPx,
                height: isCompactBlock
                  ? Math.min(position.sessionHeightPx, 36)
                  : position.sessionHeightPx,
              }
            : { height: position.sessionHeightPx }
        }
        aria-label={`Blocked: ${title}`}
      >
        <p
          className={cn(
            "flex min-w-0 items-center gap-1 font-semibold leading-tight text-[var(--brand-text-muted)]",
            isMobile
              ? isCompactBlock
                ? "text-[11px]"
                : "text-xs"
              : "truncate text-xs leading-tight"
          )}
        >
          <Lock
            className={cn(
              "shrink-0",
              isMobile && isCompactBlock ? "h-2.5 w-2.5" : "h-3 w-3"
            )}
            strokeWidth={1.75}
            aria-hidden
          />
          <span className={isMobile ? "truncate" : "truncate"}>{title}</span>
        </p>
        {showBlockTime ? (
          <p className="text-[11px] font-normal leading-tight text-[var(--brand-text-muted)]/80">
            {timeLabel}
          </p>
        ) : !isMobile ? (
          <p className="mt-0.5 truncate text-[11px] font-normal leading-tight text-[var(--brand-text-muted)]/80">
            {timeLabel}
          </p>
        ) : null}
      </button>

      <CalendarEventPreview
        mode="block"
        block={block}
        psychologistName={psychologistName}
        open={previewOpen && !chooserOpen}
        popover={popover}
        onPointerEnter={showPreview}
        onPointerLeave={hidePreview}
        onEditBlock={handleClick}
      />

      <Dialog
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        className="relative z-[70]"
      >
        <TransitionChild
          appear
          enter="transition-[opacity,backdrop-filter] duration-[180ms] ease-out"
          enterFrom="opacity-0 backdrop-blur-[0px]"
          enterTo="opacity-100 backdrop-blur-[4px]"
          leave="transition-[opacity,backdrop-filter] duration-[180ms] ease-out"
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
            enter="transform transition duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            enterFrom="opacity-0 scale-95 translate-y-2 sm:translate-y-0"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="transform transition duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
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
                  <DialogTitle className="font-heading text-lg font-semibold tracking-tight text-[var(--brand-text)]">
                    This block belongs to a recurring schedule
                  </DialogTitle>
                  <Description className="text-sm leading-relaxed text-[var(--brand-text-muted)]">
                    Choose whether to change every occurrence, or create a
                    one-time override for {occurrenceDateLabel} only.
                  </Description>
                </div>

                <div className="flex flex-col gap-3 px-6 pb-6">
                  <button
                    type="button"
                    onClick={editRecurring}
                    className={cn(adminPrimaryButtonClass, "w-full")}
                  >
                    Edit Recurring Block
                  </button>
                  <button
                    type="button"
                    onClick={createOneTimeOverride}
                    className={cn(adminSecondaryButtonClass, "w-full")}
                  >
                    Create One-time Override
                  </button>
                  <button
                    type="button"
                    onClick={() => setChooserOpen(false)}
                    className="text-sm text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
                  >
                    Cancel
                  </button>
                </div>
              </DialogPanel>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </div>
  );
}
