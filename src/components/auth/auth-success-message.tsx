import Link from "next/link";
import { Check } from "lucide-react";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface AuthSuccessMessageProps {
  title: string;
  message: string;
  email?: string;
  onResend?: () => void;
  resendLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function AuthSuccessMessage({
  title,
  message,
  email,
  onResend,
  resendLoading = false,
  className,
  children,
}: AuthSuccessMessageProps) {
  return (
    <div className={cn("flex flex-col items-center py-2 text-center", className)}>
      <div className="flex w-full max-w-sm flex-col items-center space-y-8">
        {/* Icon + headline group */}
        <div className="flex flex-col items-center space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brand-purple)]/15 bg-[var(--brand-purple-light)]/60 text-[var(--brand-purple)]">
            <Check className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="space-y-3">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-[var(--brand-text)]">
              {title}
            </h2>
            <div className="space-y-2">
              <p className={cn(type.bodyMuted, "text-base leading-relaxed")}>{message}</p>
              {email && (
                <p className="text-base font-semibold text-[var(--brand-text)]">{email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Links */}
        {(onResend || children) && (
          <div className="flex flex-col items-center space-y-4">
            {onResend && (
              <button
                type="button"
                onClick={onResend}
                disabled={resendLoading}
                className={cn(
                  type.small,
                  "text-[var(--brand-purple)]/80 transition-colors hover:text-[var(--brand-purple)] disabled:opacity-50"
                )}
              >
                {resendLoading ? "Sending…" : "Resend email"}
              </button>
            )}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/** Secondary back link for confirmation screens */
export function AuthSuccessBackLink({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className = cn(
    type.small,
    "text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-purple)]"
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
