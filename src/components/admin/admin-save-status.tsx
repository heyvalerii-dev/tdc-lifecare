"use client";

import { Check, Loader2, TriangleAlert } from "lucide-react";
import type { AdminSaveStatus } from "@/hooks/use-admin-autosave";
import { cn } from "@/lib/utils";

interface AdminSaveStatusProps {
  status: AdminSaveStatus;
  className?: string;
}

export function AdminSaveStatusIndicator({
  status,
  className,
}: AdminSaveStatusProps) {
  return (
    <div
      className={cn(
        "flex min-h-5 min-w-[7.5rem] items-center justify-end",
        className
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs transition-opacity duration-300 ease-out",
          status === "idle" && "pointer-events-none opacity-0",
          (status === "editing" || status === "saving") &&
            "font-medium text-[var(--brand-text-muted)] opacity-100",
          status === "saved" && "font-medium text-[#5C7A68] opacity-100",
          status === "error" && "font-medium text-amber-600 opacity-100"
        )}
      >
        {status === "editing" && "Editing..."}
        {status === "saving" && (
          <>
            <Loader2
              className="h-3.5 w-3.5 animate-spin"
              strokeWidth={1.75}
              aria-hidden
            />
            Saving...
          </>
        )}
        {status === "saved" && (
          <>
            <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Saved
          </>
        )}
        {status === "error" && (
          <>
            <TriangleAlert
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              aria-hidden
            />
            Couldn&apos;t save
          </>
        )}
        {status === "idle" && (
          <span className="invisible inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Saved
          </span>
        )}
      </span>
    </div>
  );
}
