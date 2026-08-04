"use client";

import { Download, ListFilter, Plus, Search } from "lucide-react";
import {
  adminControlInputClass,
  adminIconButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function IconTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#E8E2F2] bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-[var(--brand-text)] opacity-0 shadow-[0_8px_24px_rgba(93,80,122,0.12)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

interface AdminListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  /** Desktop-only filter dropdowns (>= lg). */
  desktopFilters: ReactNode;
  /** Number of active non-search filters (badge on mobile Filters button). */
  activeFilterCount?: number;
  onOpenFilters: () => void;
  onExport: () => void;
  exportDisabled?: boolean;
  exportAriaLabel?: string;
  /** Optional leading/trailing action (e.g. New client) — desktop + mobile. */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: "plus";
  };
  className?: string;
}

/**
 * Shared admin list toolbar:
 * - Search always full width on mobile
 * - Filter dropdowns only on lg+
 * - Filters button + export overflow on mobile
 */
export function AdminListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  desktopFilters,
  activeFilterCount = 0,
  onOpenFilters,
  onExport,
  exportDisabled,
  exportAriaLabel = "Export CSV",
  primaryAction,
  className,
}: AdminListToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:min-w-[16rem] lg:max-w-md lg:flex-[1.4]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-text-muted)]"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className={cn(
              adminControlInputClass,
              "w-full pl-9 pr-3 shadow-[0_1px_2px_rgba(93,80,122,0.03)] placeholder:text-[var(--brand-text-muted)]"
            )}
          />
        </div>

        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          {desktopFilters}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={
            activeFilterCount > 0
              ? `Filters, ${activeFilterCount} active`
              : "Filters"
          }
          className={cn(
            adminSecondaryButtonClass,
            "relative gap-2 px-3 lg:hidden"
          )}
        >
          <ListFilter className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Filters
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-purple)] px-1.5 text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        <IconTooltip label="Export CSV">
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            aria-label={exportAriaLabel}
            className={cn(adminIconButtonClass, "hidden lg:inline-flex")}
          >
            <Download className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        </IconTooltip>

        {primaryAction ? (
          <IconTooltip label={primaryAction.label}>
            <button
              type="button"
              onClick={primaryAction.onClick}
              aria-label={primaryAction.label}
              className={adminIconButtonClass}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          </IconTooltip>
        ) : null}
      </div>
    </div>
  );
}
