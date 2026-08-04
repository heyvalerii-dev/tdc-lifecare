"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  CustomDateRangePicker,
  formatCustomRangeLabel,
} from "@/components/admin/appointments/filters/custom-date-range-picker";
import {
  FloatingDatePicker,
  FloatingDropdown,
  FloatingDropdownChevron,
  FloatingDropdownItem,
  FloatingDropdownPanel,
  FloatingDropdownTrigger,
  useFloatingDropdownOpen,
} from "@/components/floating";
import type { DateFilterPreset } from "@/lib/admin-appointments-list";
import { cn } from "@/lib/utils";
import {
  filterOptionClass,
  filterOptionsPanelClass,
  filterTriggerClass,
  filterTriggerOpenClass,
} from "@/components/admin/appointments/filters/filter-styles";

const PAYMENT_DATE_OPTIONS: { value: DateFilterPreset; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom Range…" },
];

interface PaymentDateFilterDropdownProps {
  value: DateFilterPreset;
  customDateStart: string;
  customDateEnd: string;
  onPresetChange: (preset: DateFilterPreset) => void;
  onCustomRangeApply: (start: string, end: string) => void;
  className?: string;
}

function getDateFilterLabel(
  value: DateFilterPreset,
  customDateStart: string,
  customDateEnd: string
): string {
  if (value === "custom" && customDateStart && customDateEnd) {
    return formatCustomRangeLabel(customDateStart, customDateEnd);
  }
  return (
    PAYMENT_DATE_OPTIONS.find((opt) => opt.value === value)?.label ?? "All dates"
  );
}

function PaymentDateFilterTrigger({
  value,
  customDateStart,
  customDateEnd,
  rangePickerOpen,
}: {
  value: DateFilterPreset;
  customDateStart: string;
  customDateEnd: string;
  rangePickerOpen: boolean;
}) {
  const open = useFloatingDropdownOpen();
  const label = getDateFilterLabel(value, customDateStart, customDateEnd);

  return (
    <FloatingDropdownTrigger
      aria-label="Filter by date"
      aria-expanded={open || rangePickerOpen}
      className={cn(
        filterTriggerClass,
        (open || rangePickerOpen) && filterTriggerOpenClass,
        value !== "all"
          ? "text-[var(--brand-text)]"
          : "text-[var(--brand-text-muted)]"
      )}
    >
      <span className="truncate">{label}</span>
      <FloatingDropdownChevron />
    </FloatingDropdownTrigger>
  );
}

export function PaymentDateFilterDropdown({
  value,
  customDateStart,
  customDateEnd,
  onPresetChange,
  onCustomRangeApply,
  className,
}: PaymentDateFilterDropdownProps) {
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function handlePresetSelect(preset: DateFilterPreset) {
    if (preset === "custom") {
      setRangePickerOpen(true);
      return;
    }
    setRangePickerOpen(false);
    onPresetChange(preset);
  }

  function handleApply(start: string, end: string) {
    onCustomRangeApply(start, end);
    setRangePickerOpen(false);
  }

  function handleCancel() {
    setRangePickerOpen(false);
    if (value === "custom" && (!customDateStart || !customDateEnd)) {
      onPresetChange("all");
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative min-w-0 sm:min-w-[8.5rem]", className)}
    >
      <FloatingDropdown value={value} onChange={handlePresetSelect}>
        <PaymentDateFilterTrigger
          value={value}
          customDateStart={customDateStart}
          customDateEnd={customDateEnd}
          rangePickerOpen={rangePickerOpen}
        />
        <FloatingDropdownPanel className={filterOptionsPanelClass}>
          {PAYMENT_DATE_OPTIONS.map((option, index) => (
            <FloatingDropdownItem
              key={option.value}
              value={option.value}
              index={index}
            >
              {({ active, selected }) => (
                <div className={filterOptionClass(active, selected)}>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {selected &&
                    (option.value !== "custom" ||
                      (customDateStart && customDateEnd)) && (
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

      <FloatingDatePicker
        open={rangePickerOpen}
        onOpenChange={setRangePickerOpen}
        referenceRef={containerRef}
      >
        <CustomDateRangePicker
          initialStart={customDateStart}
          initialEnd={customDateEnd}
          onApply={handleApply}
          onCancel={handleCancel}
        />
      </FloatingDatePicker>
    </div>
  );
}
