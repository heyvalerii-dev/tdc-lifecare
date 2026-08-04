import Link from "next/link";
import { LogoMark } from "./logo-mark";
import { cn } from "@/lib/utils";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants";

export type BrandLogoVariant = "light" | "dark";
export type BrandLogoSize = "desktop" | "mobile";

interface BrandLogoProps {
  /** White text on dark backgrounds, purple text on light backgrounds */
  variant?: BrandLogoVariant;
  /**
   * Lock to a fixed size. Omit for canonical responsive sizing
   * (mobile below sm, desktop at sm and above).
   */
  size?: BrandLogoSize;
  href?: string | null;
  className?: string;
}

function sizeClasses(size?: BrandLogoSize) {
  if (size === "mobile") {
    return {
      mark: "h-[38px] w-[38px]",
      title: "text-[17px]",
      subtitle: "text-[10px]",
    };
  }

  if (size === "desktop") {
    return {
      mark: "h-[46px] w-[46px]",
      title: "text-[19px]",
      subtitle: "text-[11px]",
    };
  }

  return {
    mark: "h-[38px] w-[38px] sm:h-[46px] sm:w-[46px]",
    title: "text-[17px] sm:text-[19px]",
    subtitle: "text-[10px] sm:text-[11px]",
  };
}

export function BrandLogo({
  variant = "dark",
  size,
  href = "/",
  className,
}: BrandLogoProps) {
  const sizes = sizeClasses(size);

  const content = (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 whitespace-nowrap",
        className
      )}
    >
      <LogoMark className={cn("shrink-0", sizes.mark)} />
      <div className="flex shrink-0 flex-col gap-0">
        <span
          className={cn(
            "block font-bold leading-none tracking-tight",
            sizes.title,
            variant === "light"
              ? "text-white"
              : "text-[var(--brand-purple-dark)]"
          )}
        >
          {BRAND_NAME}
        </span>
        <span
          className={cn(
            "block font-medium uppercase leading-[1.05] tracking-[0.20em]",
            sizes.subtitle,
            variant === "light"
              ? "text-white/60"
              : "text-[var(--brand-purple-muted)]"
          )}
        >
          {BRAND_TAGLINE}
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="shrink-0 transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }

  return <div className="shrink-0">{content}</div>;
}
