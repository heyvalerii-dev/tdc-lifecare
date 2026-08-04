import { cn } from "@/lib/utils";

interface PsychologistStatusPillProps {
  isActive: boolean;
  className?: string;
}

export function PsychologistStatusPill({
  isActive,
  className,
}: PsychologistStatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        isActive
          ? "bg-[#F0F5F1] text-[#5C7A68]"
          : "bg-[var(--brand-border)]/60 text-[var(--brand-text-muted)]",
        className
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: isActive ? "#7BA88E" : "#B8B4C0" }}
        aria-hidden
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
