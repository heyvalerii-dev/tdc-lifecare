"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastMessageProps {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}

/** Lightweight success toast — no global provider required. */
export function ToastMessage({
  message,
  onDismiss,
  durationMs = 2800,
}: ToastMessageProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 left-1/2 z-[80] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2",
        "flex items-center gap-2.5 rounded-xl border border-[var(--brand-purple)]/[0.08] bg-white px-4 py-3",
        "text-sm font-medium text-[var(--brand-text)]",
        "shadow-[0_12px_40px_rgba(93,80,122,0.18)]",
        "[animation:toast-in_220ms_cubic-bezier(0.16,1,0.3,1)_both]"
      )}
    >
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0F5F1] text-[#5C7A68]">
        <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="min-w-0">{message}</span>
    </div>
  );
}
