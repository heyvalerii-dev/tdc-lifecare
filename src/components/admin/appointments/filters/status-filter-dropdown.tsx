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
import { APPOINTMENT_STATUS_DOT_COLORS } from "@/lib/admin-calendar";
import { STATUS_FILTER_OPTIONS } from "@/lib/admin-appointments-list";
import { cn } from "@/lib/utils";
import {
  filterOptionClass,
  filterOptionsPanelClass,
  filterTriggerClass,
  filterTriggerOpenClass,
} from "./filter-styles";

interface StatusFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function StatusDot({ status }: { status: string }) {
  if (!status) return null;

  return (
    <span
      className="size-1.5 shrink-0 rounded-full"
      style={{
        backgroundColor:
          APPOINTMENT_STATUS_DOT_COLORS[status] ?? "var(--brand-text-muted)",
      }}
      aria-hidden
    />
  );
}

function StatusFilterTrigger({ value }: { value: string }) {
  const open = useFloatingDropdownOpen();
  const selectedLabel =
    STATUS_FILTER_OPTIONS.find((opt) => opt.value === value)?.label ??
    "All statuses";

  return (
    <FloatingDropdownTrigger
      aria-label="Filter by status"
      className={cn(
        filterTriggerClass,
        open && filterTriggerOpenClass,
        value ? "text-[var(--brand-text)]" : "text-[var(--brand-text-muted)]"
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <StatusDot status={value} />
        <span className="truncate">{selectedLabel}</span>
      </span>
      <FloatingDropdownChevron />
    </FloatingDropdownTrigger>
  );
}

export function StatusFilterDropdown({
  value,
  onChange,
  className,
}: StatusFilterDropdownProps) {
  return (
    <FloatingDropdown
      value={value}
      onChange={onChange}
      className={cn("sm:min-w-[8rem]", className)}
    >
      <StatusFilterTrigger value={value} />
      <FloatingDropdownPanel className={filterOptionsPanelClass}>
        {STATUS_FILTER_OPTIONS.map((option, index) => (
          <FloatingDropdownItem
            key={option.value || "all"}
            value={option.value}
            index={index}
          >
            {({ active, selected }) => (
              <div className={filterOptionClass(active, selected)}>
                <StatusDot status={option.value} />
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
