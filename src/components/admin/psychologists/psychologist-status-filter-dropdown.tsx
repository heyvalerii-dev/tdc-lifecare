"use client";

import { Check } from "lucide-react";
import {
  FloatingDropdown,
  FloatingDropdownChevron,
  FloatingDropdownItem,
  FloatingDropdownPanel,
  FloatingDropdownTrigger,
  useFloatingDropdownOpen,
} from "@/components/floating";
import {
  PSYCHOLOGIST_STATUS_FILTER_OPTIONS,
  type PsychologistStatusFilter,
} from "@/lib/admin-psychologists-list";
import { cn } from "@/lib/utils";
import {
  filterOptionClass,
  filterOptionsPanelClass,
  filterTriggerClass,
  filterTriggerOpenClass,
} from "@/components/admin/appointments/filters/filter-styles";

interface PsychologistStatusFilterDropdownProps {
  value: PsychologistStatusFilter;
  onChange: (value: PsychologistStatusFilter) => void;
  className?: string;
}

function PsychologistStatusFilterTrigger({
  value,
}: {
  value: PsychologistStatusFilter;
}) {
  const open = useFloatingDropdownOpen();
  const selectedLabel =
    PSYCHOLOGIST_STATUS_FILTER_OPTIONS.find((opt) => opt.value === value)
      ?.label ?? "All Statuses";

  return (
    <FloatingDropdownTrigger
      aria-label="Filter by status"
      className={cn(
        filterTriggerClass,
        open && filterTriggerOpenClass,
        value ? "text-[var(--brand-text)]" : "text-[var(--brand-text-muted)]"
      )}
    >
      <span className="truncate">{selectedLabel}</span>
      <FloatingDropdownChevron />
    </FloatingDropdownTrigger>
  );
}

export function PsychologistStatusFilterDropdown({
  value,
  onChange,
  className,
}: PsychologistStatusFilterDropdownProps) {
  return (
    <FloatingDropdown
      value={value}
      onChange={(next) => onChange(next as PsychologistStatusFilter)}
      className={cn("sm:min-w-[8.5rem]", className)}
    >
      <PsychologistStatusFilterTrigger value={value} />
      <FloatingDropdownPanel className={filterOptionsPanelClass}>
        {PSYCHOLOGIST_STATUS_FILTER_OPTIONS.map((option, index) => (
          <FloatingDropdownItem
            key={option.value || "all"}
            value={option.value}
            index={index}
          >
            {({ active, selected }) => (
              <div className={filterOptionClass(active, selected)}>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {selected && (
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-[var(--brand-purple)]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                )}
              </div>
            )}
          </FloatingDropdownItem>
        ))}
      </FloatingDropdownPanel>
    </FloatingDropdown>
  );
}
