import { cn } from "@/lib/utils";
import { formatAuthError, isCriticalAuthError } from "@/lib/auth-errors";
import { AlertCircle } from "lucide-react";

interface AuthAlertProps {
  message: string;
  className?: string;
}

export function AuthAlert({ message, className }: AuthAlertProps) {
  const friendly = formatAuthError(message);
  const critical = isCriticalAuthError(message);

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-4 text-sm leading-relaxed",
        critical
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-[#F0D3D8] bg-[#FCF4F5] text-[#8C5C68]",
        className
      )}
    >
      <AlertCircle
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          critical ? "text-red-600" : "text-[#8C5C68]/70"
        )}
        strokeWidth={1.75}
      />
      <p>{friendly}</p>
    </div>
  );
}
