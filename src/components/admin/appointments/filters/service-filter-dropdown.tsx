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
import { getServiceIcon } from "@/lib/service-icons";
import { cn } from "@/lib/utils";
import type { Service } from "@/types/database";
import {
  filterOptionClass,
  filterOptionsPanelClass,
  filterTriggerClass,
  filterTriggerOpenClass,
} from "./filter-styles";

interface ServiceFilterDropdownProps {
  value: string;
  services: Service[];
  onChange: (value: string) => void;
  className?: string;
}

function ServiceFilterTrigger({
  value,
  services,
}: {
  value: string;
  services: Service[];
}) {
  const open = useFloatingDropdownOpen();
  const selected = services.find((s) => s.id === value);
  const SelectedIcon = selected ? getServiceIcon(selected.name) : null;

  return (
    <FloatingDropdownTrigger
      aria-label="Filter by service"
      className={cn(
        filterTriggerClass,
        open && filterTriggerOpenClass,
        value ? "text-[var(--brand-text)]" : "text-[var(--brand-text-muted)]"
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {SelectedIcon && (
          <SelectedIcon
            className="h-3.5 w-3.5 shrink-0 text-[var(--brand-purple)]/70"
            strokeWidth={1.75}
            aria-hidden
          />
        )}
        <span className="truncate">{selected?.name ?? "All services"}</span>
      </span>
      <FloatingDropdownChevron />
    </FloatingDropdownTrigger>
  );
}

export function ServiceFilterDropdown({
  value,
  services,
  onChange,
  className,
}: ServiceFilterDropdownProps) {
  return (
    <FloatingDropdown
      value={value}
      onChange={onChange}
      className={cn("sm:min-w-[8.5rem]", className)}
    >
      <ServiceFilterTrigger value={value} services={services} />
      <FloatingDropdownPanel className={filterOptionsPanelClass}>
        <FloatingDropdownItem value="" index={0}>
          {({ active, selected }) => (
            <div className={filterOptionClass(active, selected)}>
              <span className="min-w-0 flex-1 truncate">All services</span>
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

        {services.map((service, serviceIndex) => {
          const Icon = getServiceIcon(service.name);
          return (
            <FloatingDropdownItem
              key={service.id}
              value={service.id}
              index={serviceIndex + 1}
            >
              {({ active, selected }) => (
                <div className={filterOptionClass(active, selected)}>
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-[var(--brand-purple)]/70"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{service.name}</span>
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
          );
        })}
      </FloatingDropdownPanel>
    </FloatingDropdown>
  );
}
