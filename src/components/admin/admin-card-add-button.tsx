"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminCardAddButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function AdminCardAddButton({
  onClick,
  label = "Add",
  className,
}: AdminCardAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg",
        "text-[var(--brand-text-muted)] transition-colors duration-150 ease-out",
        "hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
        className
      )}
    >
      <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
