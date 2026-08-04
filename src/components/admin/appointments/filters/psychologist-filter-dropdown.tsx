"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import {
  FloatingDropdown,
  FloatingDropdownChevron,
  FloatingDropdownItem,
  FloatingDropdownPanel,
  FloatingDropdownTrigger,
  useFloatingDropdownOpen,
} from "@/components/floating";
import { getPsychologistIdentityColorById } from "@/lib/admin-calendar";
import { cn } from "@/lib/utils";
import type { Psychologist } from "@/types/database";
import {
  filterOptionClass,
  filterOptionsPanelClass,
  filterSearchInputClass,
  filterTriggerClass,
  filterTriggerOpenClass,
} from "./filter-styles";

const PSYCHOLOGIST_SEARCH_THRESHOLD = 4;

interface PsychologistFilterDropdownProps {
  value: string;
  psychologists: Psychologist[];
  onChange: (value: string) => void;
  className?: string;
}

function PsychologistFilterTrigger({
  value,
  psychologists,
}: {
  value: string;
  psychologists: Psychologist[];
}) {
  const open = useFloatingDropdownOpen();
  const selectedLabel =
    psychologists.find((p) => p.id === value)?.name ?? "All psychologists";

  return (
    <FloatingDropdownTrigger
      aria-label="Filter by psychologist"
      className={cn(
        filterTriggerClass,
        open && filterTriggerOpenClass,
        value ? "text-[var(--brand-text)]" : "text-[var(--brand-text-muted)]"
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {value && (
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{
              backgroundColor: getPsychologistIdentityColorById(
                value,
                psychologists
              ),
            }}
            aria-hidden
          />
        )}
        <span className="truncate">{selectedLabel}</span>
      </span>
      <FloatingDropdownChevron />
    </FloatingDropdownTrigger>
  );
}

export function PsychologistFilterDropdown({
  value,
  psychologists,
  onChange,
  className,
}: PsychologistFilterDropdownProps) {
  const [query, setQuery] = useState("");

  const filteredPsychologists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return psychologists;
    return psychologists.filter((p) => p.name.toLowerCase().includes(q));
  }, [psychologists, query]);

  const showSearch = psychologists.length > PSYCHOLOGIST_SEARCH_THRESHOLD;

  return (
    <FloatingDropdown
      value={value}
      onChange={(next) => {
        onChange(next);
        setQuery("");
      }}
      className={cn("sm:min-w-[9.5rem]", className)}
    >
      <PsychologistFilterTrigger value={value} psychologists={psychologists} />
      <FloatingDropdownPanel
        className={cn(filterOptionsPanelClass, showSearch && "max-h-80")}
      >
        {showSearch && (
          <div
            className="sticky top-0 z-10 border-b border-[var(--brand-purple)]/[0.06] bg-white p-1.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--brand-text-muted)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search psychologists…"
                aria-label="Search psychologists"
                className={cn(filterSearchInputClass, "pl-8")}
              />
            </div>
          </div>
        )}

        <FloatingDropdownItem value="" index={0}>
          {({ active, selected }) => (
            <div className={filterOptionClass(active, selected)}>
              <span className="min-w-0 flex-1 truncate">All psychologists</span>
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

        {filteredPsychologists.map((psychologist, psychIndex) => (
          <FloatingDropdownItem
            key={psychologist.id}
            value={psychologist.id}
            index={psychIndex + 1}
          >
            {({ active, selected }) => (
              <div className={filterOptionClass(active, selected)}>
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: getPsychologistIdentityColorById(
                      psychologist.id,
                      psychologists
                    ),
                  }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">
                  {psychologist.name}
                </span>
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

        {showSearch && filteredPsychologists.length === 0 && (
          <p className="px-2.5 py-3 text-center text-xs text-[var(--brand-text-muted)]">
            No psychologists match your search.
          </p>
        )}
      </FloatingDropdownPanel>
    </FloatingDropdown>
  );
}
