import { cn } from "@/lib/utils";
import { type } from "@/lib/typography";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary:
    "bg-[var(--brand-purple)] text-white hover:bg-[var(--brand-purple-dark)] active:bg-[var(--brand-purple-dark)]",
  secondary:
    "bg-[var(--brand-purple-light)] text-[var(--brand-purple-dark)] hover:bg-[var(--brand-purple)]/10",
  outline:
    "border border-[var(--brand-purple)]/25 bg-white text-[var(--brand-text)] hover:bg-[var(--brand-purple-light)]",
  ghost:
    "text-[var(--brand-text-muted)] hover:bg-[var(--brand-purple-light)] hover:text-[var(--brand-purple-dark)]",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm font-medium",
  md: "px-5 py-2.5 text-base font-semibold",
  lg: "px-6 py-3 text-base font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-colors",
        type.button,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
