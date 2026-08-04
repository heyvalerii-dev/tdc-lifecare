"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { detailLinkClass } from "@/components/admin/appointments/appointment-detail/detail-styles";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface AdminBackLinkProps {
  /** Used when there is no in-app history (direct link / bookmark). */
  fallbackHref: string;
  className?: string;
}

function canGoBack(): boolean {
  if (typeof window === "undefined") return false;

  // Next.js App Router tracks navigation index on history state.
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof idx === "number") return idx > 0;

  if (window.history.length <= 1) return false;

  const referrer = document.referrer;
  if (!referrer) return window.history.length > 2;

  try {
    return new URL(referrer).origin === window.location.origin;
  } catch {
    return window.history.length > 2;
  }
}

export function AdminBackLink({ fallbackHref, className }: AdminBackLinkProps) {
  const router = useRouter();

  function handleClick() {
    if (canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        type.nav,
        "inline-flex items-center gap-1.5 text-[var(--brand-text-muted)]",
        detailLinkClass,
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      Back
    </button>
  );
}
