"use client";

import { Check, HeartHandshake } from "lucide-react";
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
} from "@/components/admin/appointments/filters/filter-styles";
import { getPsychologistIdentityColorById } from "@/lib/admin-calendar";
import { adminControlInputClass } from "@/lib/admin-controls";
import { cn } from "@/lib/utils";
import type { Psychologist } from "@/types/database";

interface CalendarMobilePsychologistSelectProps {
  value: string;
  psychologists: Psychologist[];
  onChange: (psychologistId: string) => void;
}

function PsychologistSelectTrigger({
  name,
  accentColor,
}: {
  name: string;
  accentColor: string;
}) {
  const open = useFloatingDropdownOpen();

  return (
    <FloatingDropdownTrigger
      aria-label="Select psychologist"
      className={cn(
        adminControlInputClass,
        "flex h-10 min-h-10 w-full items-center justify-between gap-2 px-3 text-left",
        open && "border-[var(--brand-purple)]/40 ring-2 ring-[var(--brand-purple)]/15"
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <HeartHandshake
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: accentColor }}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="truncate text-sm font-medium text-[var(--brand-text)]">
          {name}
        </span>
      </span>
      <FloatingDropdownChevron />
    </FloatingDropdownTrigger>
  );
}

export function CalendarMobilePsychologistSelect({
  value,
  psychologists,
  onChange,
}: CalendarMobilePsychologistSelectProps) {
  const selected =
    psychologists.find((psychologist) => psychologist.id === value) ??
    psychologists[0];
  const accentColor = getPsychologistIdentityColorById(
    selected?.id,
    psychologists
  );

  if (!selected) {
    return null;
  }

  return (
    <FloatingDropdown value={value} onChange={onChange}>
      <PsychologistSelectTrigger
        name={selected.name}
        accentColor={accentColor}
      />
      <FloatingDropdownPanel className={filterOptionsPanelClass}>
        {psychologists.map((psychologist, index) => {
          const color = getPsychologistIdentityColorById(
            psychologist.id,
            psychologists
          );

          return (
            <FloatingDropdownItem
              key={psychologist.id}
              value={psychologist.id}
              index={index}
            >
              {({ active, selected: isSelected }) => (
                <div className={filterOptionClass(active, isSelected)}>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <HeartHandshake
                      className="h-4 w-4 shrink-0"
                      style={{ color }}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="truncate">{psychologist.name}</span>
                  </span>
                  {isSelected && (
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
