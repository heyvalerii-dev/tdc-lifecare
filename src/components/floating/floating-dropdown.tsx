"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useClick,
  useDismiss,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLOATING_Z_POPOVER } from "./constants";
import { FloatingPopover } from "./floating-popover";
import { useFloatingPopover } from "./use-floating-popover";

interface FloatingDropdownContextValue<T> {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: T;
  onSelect: (value: T) => void;
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
  getItemProps: ReturnType<typeof useInteractions>["getItemProps"];
  registerItem: (index: number, node: HTMLElement | null) => void;
  popover: ReturnType<typeof useFloatingPopover>;
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
}

const FloatingDropdownContext =
  createContext<FloatingDropdownContextValue<unknown> | null>(null);

function useFloatingDropdownContext<T>() {
  const ctx = useContext(FloatingDropdownContext);
  if (!ctx) {
    throw new Error("FloatingDropdown components must be used within FloatingDropdown");
  }
  return ctx as FloatingDropdownContextValue<T>;
}

interface FloatingDropdownProps<T> {
  value: T;
  onChange: (value: T) => void;
  children: React.ReactNode;
  className?: string;
}

export function FloatingDropdown<T>({
  value,
  onChange,
  children,
  className,
}: FloatingDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const popover = useFloatingPopover({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    matchReferenceWidth: true,
    scaleAnimation: true,
  });

  const click = useClick(popover.context);
  const dismiss = useDismiss(popover.context);
  const listboxRole = useRole(popover.context, { role: "listbox" });
  const listNavigation = useListNavigation(popover.context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    listboxRole,
    listNavigation,
  ]);

  const registerItem = useCallback((index: number, node: HTMLElement | null) => {
    listRef.current[index] = node;
  }, []);

  const onSelect = useCallback(
    (next: T) => {
      onChange(next);
      setOpen(false);
    },
    [onChange]
  );

  const ctx = useMemo(
    () => ({
      open,
      setOpen,
      value,
      onSelect,
      activeIndex,
      setActiveIndex,
      getItemProps,
      registerItem,
      popover,
      getReferenceProps,
      getFloatingProps,
    }),
    [
      open,
      value,
      onSelect,
      activeIndex,
      getItemProps,
      registerItem,
      popover,
      getReferenceProps,
      getFloatingProps,
    ]
  );

  return (
    <FloatingDropdownContext.Provider
      value={ctx as FloatingDropdownContextValue<unknown>}
    >
      <div className={cn("relative min-w-0", className)}>{children}</div>
    </FloatingDropdownContext.Provider>
  );
}

interface FloatingDropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
  disabled?: boolean;
  id?: string;
}

export function FloatingDropdownTrigger({
  children,
  className,
  "aria-label": ariaLabel,
  disabled,
  id,
}: FloatingDropdownTriggerProps) {
  const { popover, getReferenceProps, open } = useFloatingDropdownContext();

  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={open}
      className={className}
      ref={popover.refs.setReference}
      {...getReferenceProps()}
    >
      {children}
    </button>
  );
}

interface FloatingDropdownPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingDropdownPanel({
  children,
  className,
}: FloatingDropdownPanelProps) {
  const { open, popover, getFloatingProps } = useFloatingDropdownContext();

  return (
    <FloatingPopover
      open={open}
      popover={popover}
      zIndex={FLOATING_Z_POPOVER}
      interactive
      role="listbox"
      getFloatingProps={getFloatingProps}
    >
      <div className={cn("outline-none", className)}>{children}</div>
    </FloatingPopover>
  );
}

interface FloatingDropdownItemProps<T> {
  value: T;
  index: number;
  children:
    | React.ReactNode
    | ((state: { active: boolean; selected: boolean }) => React.ReactNode);
  className?: string;
  disabled?: boolean;
}

export function FloatingDropdownItem<T>({
  value,
  index,
  children,
  className,
  disabled = false,
}: FloatingDropdownItemProps<T>) {
  const {
    value: selectedValue,
    onSelect,
    activeIndex,
    getItemProps,
    registerItem,
  } = useFloatingDropdownContext<T>();

  const selected = Object.is(value, selectedValue);
  const active = activeIndex === index;

  return (
    <div
      ref={(node) => registerItem(index, node)}
      role="option"
      aria-selected={selected}
      className={className}
      {...getItemProps({
        onClick: () => {
          if (!disabled) onSelect(value);
        },
      })}
    >
      {typeof children === "function" ? children({ active, selected }) : children}
    </div>
  );
}

export function FloatingDropdownChevron() {
  return (
    <ChevronDown
      className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text-muted)]"
      strokeWidth={2}
      aria-hidden
    />
  );
}

export function useFloatingDropdownOpen(): boolean {
  return useFloatingDropdownContext().open;
}
