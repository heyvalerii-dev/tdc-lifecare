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
import { PAYMENT_METHOD_FILTER_OPTIONS } from "@/lib/admin-payments-list";
import { cn } from "@/lib/utils";
import {
  filterOptionClass,
  filterOptionsPanelClass,
  filterTriggerClass,
  filterTriggerOpenClass,
} from "@/components/admin/appointments/filters/filter-styles";

interface PaymentMethodFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function PaymentMethodFilterTrigger({ value }: { value: string }) {
  const open = useFloatingDropdownOpen();
  const selectedLabel =
    PAYMENT_METHOD_FILTER_OPTIONS.find((opt) => opt.value === value)?.label ??
    "All Methods";

  return (
    <FloatingDropdownTrigger
      aria-label="Filter by payment method"
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

export function PaymentMethodFilterDropdown({
  value,
  onChange,
  className,
}: PaymentMethodFilterDropdownProps) {
  return (
    <FloatingDropdown
      value={value}
      onChange={onChange}
      className={cn("sm:min-w-[8.5rem]", className)}
    >
      <PaymentMethodFilterTrigger value={value} />
      <FloatingDropdownPanel className={filterOptionsPanelClass}>
        {PAYMENT_METHOD_FILTER_OPTIONS.map((option, index) => (
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
