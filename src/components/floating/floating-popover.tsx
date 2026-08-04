"use client";

import { FloatingPortal } from "@floating-ui/react";
import { cn } from "@/lib/utils";
import { useOverlayPortalRoot } from "./overlay-portal-context";
import type { UseFloatingPopoverReturn } from "./use-floating-popover";

interface FloatingPopoverProps {
  open: boolean;
  popover: UseFloatingPopoverReturn;
  children: React.ReactNode;
  className?: string;
  zIndex?: number;
  interactive?: boolean;
  role?: React.AriaRole;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  getFloatingProps?: () => Record<string, unknown>;
}

export function FloatingPopover({
  open,
  popover,
  children,
  className,
  zIndex = 50,
  interactive = false,
  role = "dialog",
  onPointerEnter,
  onPointerLeave,
  getFloatingProps,
}: FloatingPopoverProps) {
  const { refs, floatingStyles, isMounted } = popover;
  const floatingProps = getFloatingProps?.() ?? {};
  const overlayRoot = useOverlayPortalRoot();

  if (!open && !isMounted) return null;

  return (
    <FloatingPortal root={overlayRoot ?? undefined}>
      {isMounted && (
        <div
          ref={refs.setFloating}
          role={role}
          style={{ ...floatingStyles, zIndex }}
          onMouseEnter={onPointerEnter}
          onMouseLeave={onPointerLeave}
          className={cn(
            interactive ? "pointer-events-auto" : "pointer-events-none",
            className
          )}
          {...floatingProps}
        >
          {children}
        </div>
      )}
    </FloatingPortal>
  );
}
