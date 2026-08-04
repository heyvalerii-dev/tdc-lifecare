"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminCardCloseButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function AdminCardCloseButton({
  onClick,
  label = "Close editor",
  className,
}: AdminCardCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg",
        "text-[var(--brand-text-muted)] transition-colors duration-150 ease-out",
        "hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-text)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
        className
      )}
    >
      <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
