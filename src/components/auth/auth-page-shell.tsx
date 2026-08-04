import { BrandLogo } from "@/components/brand/brand-logo";
import { authCardClass, authPageWidth } from "@/components/auth/auth-styles";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface AuthPageShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Hide the page title block (e.g. when the card contains its own hero message). */
  suppressHeader?: boolean;
}

export function AuthPageShell({
  title,
  subtitle,
  children,
  suppressHeader = false,
}: AuthPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white py-12 sm:py-16">
      <div className={authPageWidth}>
        <div className="flex justify-center">
          <BrandLogo href="/" variant="dark" />
        </div>

        {!suppressHeader && (
          <div className="mt-10 space-y-3 text-center sm:mt-12">
            <h1 className={type.pageTitle}>{title}</h1>
            <p className={cn(type.bodyMuted, "mx-auto max-w-md text-base sm:text-lg")}>
              {subtitle}
            </p>
          </div>
        )}

        <div
          className={cn(
            authCardClass,
            suppressHeader ? "mt-10 sm:mt-12" : "mt-8 sm:mt-10"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
