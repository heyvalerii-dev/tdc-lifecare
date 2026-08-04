import { CLIENT_STATUS_LABELS, type ClientLifecycleStatus } from "@/lib/admin-clients-list";
import { cn } from "@/lib/utils";

const statusStyles: Record<ClientLifecycleStatus, string> = {
  active: "bg-[#F0F5F1] text-[#5C7A68]",
  no_upcoming: "bg-[#FAF3DC] text-[#9A7B1A]",
  new: "bg-[var(--brand-purple-light)] text-[var(--brand-purple)]",
};

const statusDots: Record<ClientLifecycleStatus, string> = {
  active: "#7BA88E",
  no_upcoming: "#D4B84A",
  new: "#8B78C6",
};

interface ClientStatusPillProps {
  status: ClientLifecycleStatus;
  className?: string;
}

export function ClientStatusPill({ status, className }: ClientStatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-opacity duration-200",
        statusStyles[status],
        className
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: statusDots[status] }}
        aria-hidden
      />
      {CLIENT_STATUS_LABELS[status]}
    </span>
  );
}
