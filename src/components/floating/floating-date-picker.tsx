"use client";

import { useEffect } from "react";
import { useDismiss, useInteractions } from "@floating-ui/react";
import { FLOATING_Z_POPOVER } from "./constants";
import { FloatingPopover } from "./floating-popover";
import { useFloatingPopover } from "./use-floating-popover";

interface FloatingDatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

export function FloatingDatePicker({
  open,
  onOpenChange,
  referenceRef,
  children,
}: FloatingDatePickerProps) {
  const popover = useFloatingPopover({
    open,
    onOpenChange,
    placement: "bottom-start",
    scaleAnimation: true,
  });

  const dismiss = useDismiss(popover.context);
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    const node = referenceRef.current;
    if (node) {
      popover.refs.setReference(node);
    }
  }, [open, referenceRef, popover.refs]);

  return (
    <FloatingPopover
      open={open}
      popover={popover}
      zIndex={FLOATING_Z_POPOVER}
      interactive
      role="dialog"
      getFloatingProps={getFloatingProps}
    >
      {children}
    </FloatingPopover>
  );
}
