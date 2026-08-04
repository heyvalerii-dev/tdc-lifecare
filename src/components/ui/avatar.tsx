"use client";

import { useState } from "react";
import { getAvatarInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-base",
  /** Profile hero — ~104px */
  xl: "h-[6.5rem] w-[6.5rem] text-2xl",
  /** Large upload target — ~150px */
  "2xl": "h-[9.375rem] w-[9.375rem] text-3xl",
};

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
  /** Soft purple initials (default) vs solid purple for dark header menus. */
  tone?: "soft" | "solid";
}

export function Avatar({
  name,
  email,
  src,
  size = "md",
  className,
  tone = "soft",
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getAvatarInitials(name, email);
  const showImage = Boolean(src) && !imageFailed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        sizeClasses[size],
        tone === "soft"
          ? "bg-[var(--brand-purple-light)]/55 text-[var(--brand-purple-dark)]"
          : "bg-[var(--brand-purple)] text-white",
        className
      )}
      aria-hidden={!name && !email}
      aria-label={name ? `${name} avatar` : undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote OAuth URLs; fallback on error
        <img
          src={src!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
