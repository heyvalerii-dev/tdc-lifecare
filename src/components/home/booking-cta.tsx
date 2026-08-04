import Link from "next/link";
import { cn } from "@/lib/utils";
import { homeRadiusButton, homeTactilePrimary } from "./home-styles";

interface BookingCtaProps {
  variant?: "primary" | "secondary";
  size?: "default" | "compact";
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function BookingCta({
  variant = "primary",
  size = "default",
  fullWidth = false,
  className,
  children = "Book an Appointment",
}: BookingCtaProps) {
  return (
    <Link
      href="/book"
      className={cn(
        "inline-flex min-h-11 items-center justify-center font-medium",
        homeRadiusButton,
        fullWidth && "w-full sm:w-auto",
        size === "default" ? "px-5 py-2.5 text-sm" : "min-h-11 px-4 py-2.5 text-sm",
        variant === "primary" &&
          cn(
            homeTactilePrimary,
            "bg-[var(--brand-purple)] text-white hover:bg-[var(--brand-purple-dark)]"
          ),
        variant === "secondary" &&
          "text-[var(--brand-text)] transition-all duration-[250ms] ease-out hover:-translate-y-0.5 hover:text-[var(--brand-purple)]",
        className
      )}
    >
      {children}
    </Link>
  );
}
