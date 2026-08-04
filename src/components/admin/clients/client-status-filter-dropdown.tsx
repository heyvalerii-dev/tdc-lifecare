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
  CLIENT_STATUS_FILTER_OPTIONS,
  type ClientStatusFilter,
} from "@/lib/admin-clients-list";
import { cn } from "@/lib/utils";
import {
  filterOptionClass,
  filterOptionsPanelClass,
  filterTriggerClass,
  filterTriggerOpenClass,
} from "@/components/admin/appointments/filters/filter-styles";

interface ClientStatusFilterDropdownProps {
  value: ClientStatusFilter;
  onChange: (value: ClientStatusFilter) => void;
  className?: string;
}

function ClientStatusFilterTrigger({ value }: { value: ClientStatusFilter }) {
  const open = useFloatingDropdownOpen();
  const selectedLabel =
    CLIENT_STATUS_FILTER_OPTIONS.find((option) => option.value === value)?.label ??
    "All statuses";

  return (
    <FloatingDropdownTrigger
      aria-label="Filter by client status"
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

export function ClientStatusFilterDropdown({
  value,
  onChange,
  className,
}: ClientStatusFilterDropdownProps) {
  return (
    <FloatingDropdown
      value={value}
      onChange={(next) => onChange(next as ClientStatusFilter)}
      className={cn("sm:min-w-[11rem]", className)}
    >
      <ClientStatusFilterTrigger value={value} />
      <FloatingDropdownPanel className={filterOptionsPanelClass}>
        {CLIENT_STATUS_FILTER_OPTIONS.map((option, index) => (
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
