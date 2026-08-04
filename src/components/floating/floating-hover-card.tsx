"use client";

import { useCallback } from "react";
import {
  CALENDAR_PREVIEW_WIDTH_PX,
  CALENDAR_TOOLTIP_WIDTH_PX,
  FLOATING_Z_HOVER,
} from "./constants";
import { FloatingPopover } from "./floating-popover";
import {
  useFloatingPopover,
  type UseFloatingPopoverOptions,
  type UseFloatingPopoverReturn,
} from "./use-floating-popover";

export type FloatingHoverCardVariant = "calendar-preview" | "calendar-buffer";

const VARIANT_CONFIG: Record<
  FloatingHoverCardVariant,
  Pick<UseFloatingPopoverOptions, "placementStrategy" | "width">
> = {
  "calendar-preview": {
    placementStrategy: "calendar-hover",
    width: CALENDAR_PREVIEW_WIDTH_PX,
  },
  "calendar-buffer": {
    placementStrategy: "calendar-hover",
    width: CALENDAR_TOOLTIP_WIDTH_PX,
  },
};

interface UseFloatingHoverCardOptions {
  open: boolean;
  variant?: FloatingHoverCardVariant;
  width?: number;
}

/** Binds a hover card to a reference element via the returned setReference callback. */
export function useFloatingHoverCard({
  open,
  variant = "calendar-preview",
  width,
}: UseFloatingHoverCardOptions) {
  const config = VARIANT_CONFIG[variant];

  const popover = useFloatingPopover({
    open,
    placementStrategy: config.placementStrategy,
    width: width ?? config.width,
  });

  const setReference = useCallback(
    (node: HTMLElement | null) => {
      popover.setReference(node);
    },
    [popover.setReference]
  );

  return { popover, setReference };
}

interface FloatingHoverCardProps {
  open: boolean;
  popover: ReturnType<typeof useFloatingPopover>;
  children: React.ReactNode;
  interactive?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function FloatingHoverCard({
  open,
  popover,
  children,
  interactive = true,
  onPointerEnter,
  onPointerLeave,
}: FloatingHoverCardProps) {
  return (
    <FloatingPopover
      open={open}
      popover={popover}
      zIndex={FLOATING_Z_HOVER}
      interactive={interactive}
      role="tooltip"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </FloatingPopover>
  );
}

export { CALENDAR_PREVIEW_WIDTH_PX, CALENDAR_TOOLTIP_WIDTH_PX };
