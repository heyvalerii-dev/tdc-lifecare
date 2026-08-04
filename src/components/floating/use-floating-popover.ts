"use client";

import {
  autoUpdate,
  flip,
  limitShift,
  offset,
  shift,
  size,
  type Placement,
} from "@floating-ui/react";
import {
  useFloating,
  useTransitionStyles,
  type UseFloatingReturn,
} from "@floating-ui/react";
import { useCallback, useMemo } from "react";
import {
  FLOATING_CALENDAR_SHIFT_PADDING_PX,
  FLOATING_CLOSE_DURATION_MS,
  FLOATING_OFFSET_PX,
  FLOATING_OPEN_DURATION_MS,
  FLOATING_SHIFT_PADDING_PX,
} from "./constants";

export type FloatingPopoverPlacement = Placement;

/** Calendar hover cards: right → left → top → bottom, stay near reference. */
export const CALENDAR_HOVER_FLIP_PLACEMENTS: Placement[] = [
  "left-start",
  "top",
  "bottom",
];

export type FloatingPlacementStrategy = "default" | "calendar-hover";

export interface UseFloatingPopoverOptions {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: FloatingPopoverPlacement;
  placementStrategy?: FloatingPlacementStrategy;
  offsetPx?: number;
  /** Match floating element width to the reference element. */
  matchReferenceWidth?: boolean;
  /** Fixed width in pixels (overrides matchReferenceWidth). */
  width?: number;
  /** Dropdown-style scale animation in addition to translate. */
  scaleAnimation?: boolean;
}

export interface UseFloatingPopoverReturn {
  refs: UseFloatingReturn["refs"];
  floatingStyles: React.CSSProperties;
  context: UseFloatingReturn["context"];
  isMounted: boolean;
  isPositioned: boolean;
  transitionStyles: React.CSSProperties;
  placement: Placement;
  setReference: (node: HTMLElement | null) => void;
}

export function useFloatingPopover({
  open,
  onOpenChange,
  placement,
  placementStrategy = "default",
  offsetPx = FLOATING_OFFSET_PX,
  matchReferenceWidth = false,
  width,
  scaleAnimation = false,
}: UseFloatingPopoverOptions): UseFloatingPopoverReturn {
  const isCalendarHover = placementStrategy === "calendar-hover";
  const resolvedPlacement =
    placement ?? (isCalendarHover ? "right-start" : "top");
  const shiftPadding = isCalendarHover
    ? FLOATING_CALENDAR_SHIFT_PADDING_PX
    : FLOATING_SHIFT_PADDING_PX;

  const middleware = useMemo(() => {
    const items = [
      offset(offsetPx),
      isCalendarHover
        ? flip({
            fallbackPlacements: CALENDAR_HOVER_FLIP_PLACEMENTS,
            padding: FLOATING_CALENDAR_SHIFT_PADDING_PX,
          })
        : flip({ padding: FLOATING_SHIFT_PADDING_PX }),
      shift({
        padding: shiftPadding,
        ...(isCalendarHover ? { limiter: limitShift() } : {}),
      }),
    ];

    if (matchReferenceWidth) {
      items.push(
        size({
          apply({ rects, elements }) {
            Object.assign(elements.floating.style, {
              width: `${rects.reference.width}px`,
            });
          },
        })
      );
    }

    return items;
  }, [offsetPx, matchReferenceWidth, isCalendarHover, shiftPadding]);

  const { refs, context, placement: activePlacement, x, y, strategy } =
    useFloating({
      open,
      onOpenChange,
      placement: resolvedPlacement,
      strategy: "fixed",
      middleware,
      whileElementsMounted: autoUpdate,
    });

  const isPositioned = x != null && y != null;

  const translateOpen = scaleAnimation
    ? "translateY(0) scale(1)"
    : "translateY(0)";
  const translateInitial = scaleAnimation
    ? "translateY(4px) scale(0.98)"
    : "translateY(4px)";
  const translateClose = scaleAnimation
    ? "translateY(4px) scale(0.98)"
    : "translateY(4px)";

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: {
      open: FLOATING_OPEN_DURATION_MS,
      close: FLOATING_CLOSE_DURATION_MS,
    },
    initial: {
      opacity: 0,
      transform: translateInitial,
    },
    open: {
      opacity: 1,
      transform: translateOpen,
    },
    close: {
      opacity: 0,
      transform: translateClose,
    },
  });

  const mergedFloatingStyles: React.CSSProperties = {
    position: strategy,
    top: y ?? 0,
    left: x ?? 0,
    visibility: isPositioned ? "visible" : "hidden",
    ...(width != null ? { width } : {}),
    ...transitionStyles,
  };

  const setReference = useCallback((node: HTMLElement | null) => {
    refs.setReference(node);
  }, [refs]);

  return {
    refs,
    floatingStyles: mergedFloatingStyles,
    context,
    isMounted,
    isPositioned,
    transitionStyles,
    placement: activePlacement,
    setReference,
  };
}
