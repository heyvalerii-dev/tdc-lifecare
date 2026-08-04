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
import { cn } from "@/lib/utils";
import {
  filterOptionClass,
  filterOptionsPanelClass,
  filterTriggerClass,
  filterTriggerOpenClass,
} from "@/components/admin/appointments/filters/filter-styles";

interface SpecialtyFilterDropdownProps {
  value: string;
  specialties: string[];
  onChange: (value: string) => void;
  className?: string;
}

function SpecialtyFilterTrigger({
  value,
  specialties,
}: {
  value: string;
  specialties: string[];
}) {
  const open = useFloatingDropdownOpen();
  const selectedLabel =
    value === ""
      ? "All Specialties"
      : specialties.includes(value)
        ? value
        : value;

  return (
    <FloatingDropdownTrigger
      aria-label="Filter by specialty"
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

export function SpecialtyFilterDropdown({
  value,
  specialties,
  onChange,
  className,
}: SpecialtyFilterDropdownProps) {
  const options = [
    { value: "", label: "All Specialties" },
    ...specialties.map((specialty) => ({
      value: specialty,
      label: specialty,
    })),
  ];

  return (
    <FloatingDropdown
      value={value}
      onChange={onChange}
      className={cn("sm:min-w-[9.5rem]", className)}
    >
      <SpecialtyFilterTrigger value={value} specialties={specialties} />
      <FloatingDropdownPanel className={filterOptionsPanelClass}>
        {options.map((option, index) => (
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
