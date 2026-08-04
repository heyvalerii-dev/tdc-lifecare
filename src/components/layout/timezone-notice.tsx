import { Clock } from "lucide-react";
import { TIMEZONE_LABEL } from "@/lib/constants";

export function TimezoneNotice() {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--brand-text-muted)]">
      <Clock className="h-3.5 w-3.5" />
      <span>All times shown in {TIMEZONE_LABEL}</span>
    </div>
  );
}
