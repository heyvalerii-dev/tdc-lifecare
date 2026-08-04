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
  filterOptionClass,
  filterOptionsPanelClass,
  filterTriggerClass,
  filterTriggerOpenClass,
} from "@/components/admin/appointments/filters/filter-styles";
import { TIME_SLOT_OPTIONS } from "@/lib/time-slots";
import { cn } from "@/lib/utils";

interface TimeSlotSelectProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

function TimeSlotTrigger({ value }: { value: string }) {
  const open = useFloatingDropdownOpen();
  const label =
    TIME_SLOT_OPTIONS.find((opt) => opt.value === value)?.label ?? value;

  return (
    <FloatingDropdownTrigger
      aria-label="Select time"
      className={cn(
        filterTriggerClass,
        "min-w-[7.25rem] justify-between",
        open && filterTriggerOpenClass,
        value ? "text-[var(--brand-text)]" : "text-[var(--brand-text-muted)]"
      )}
    >
      <span className="truncate">{label}</span>
      <FloatingDropdownChevron />
    </FloatingDropdownTrigger>
  );
}

export function TimeSlotSelect({
  value,
  onChange,
  ariaLabel,
  className,
}: TimeSlotSelectProps) {
  const options = TIME_SLOT_OPTIONS.some((opt) => opt.value === value)
    ? TIME_SLOT_OPTIONS
    : [{ value, label: value }, ...TIME_SLOT_OPTIONS];

  return (
      <FloatingDropdown
      value={value}
      onChange={onChange}
      className={cn("min-w-0", className)}
    >
      <TimeSlotTrigger value={value} />
      <FloatingDropdownPanel
        className={cn(filterOptionsPanelClass, "max-h-56 overflow-y-auto")}
        aria-label={ariaLabel}
      >
        {options.map((option, index) => (
          <FloatingDropdownItem
            key={option.value}
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
