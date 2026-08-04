"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  adminControlRadius,
  adminIconButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import { cn } from "@/lib/utils";

interface AdminListPaginationProps {
  /** 1-based page for desktop numbered pagination. */
  page: number;
  pageSize: number;
  total: number;
  pageNumbers: Array<number | "ellipsis">;
  onPageChange: (page: number) => void;
  /** How many rows are currently shown on mobile (Load More). */
  mobileVisibleCount: number;
  onLoadMore: () => void;
  className?: string;
}

export function AdminListPagination({
  page,
  pageSize,
  total,
  pageNumbers,
  onPageChange,
  mobileVisibleCount,
  onLoadMore,
  className,
}: AdminListPaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const desktopStart = (page - 1) * pageSize + 1;
  const desktopEnd = Math.min(page * pageSize, total);
  const mobileEnd = Math.min(mobileVisibleCount, total);
  const canLoadMore = mobileVisibleCount < total;

  return (
    <div className={cn("mt-4", className)}>
      {/* Desktop: classic pagination */}
      <div className="hidden items-center justify-between gap-3 lg:flex">
        <p className="text-sm text-[var(--brand-text-muted)]">
          Showing {desktopStart}–{desktopEnd} of {total}
        </p>
        {totalPages > 1 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              aria-label="Previous page"
              className={adminIconButtonClass}
            >
              <ChevronLeft
                className="h-[18px] w-[18px]"
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
            <div className="flex items-center gap-0.5 px-0.5">
              {pageNumbers.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1.5 text-sm text-[var(--brand-text-muted)]"
                    aria-hidden
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPageChange(item)}
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? "page" : undefined}
                    className={cn(
                      "flex h-9 min-w-9 items-center justify-center px-2 text-sm transition-colors duration-150 ease-out",
                      adminControlRadius,
                      item === page
                        ? "bg-[var(--brand-purple-light)]/70 font-medium text-[var(--brand-purple)]"
                        : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-purple-light)]/40 hover:text-[var(--brand-text)]"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              aria-label="Next page"
              className={adminIconButtonClass}
            >
              <ChevronRight
                className="h-[18px] w-[18px]"
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
          </div>
        ) : null}
      </div>

      {/* Mobile: showing label + Load More */}
      <div className="flex flex-col items-stretch gap-3 lg:hidden">
        <p className="text-center text-sm text-[var(--brand-text-muted)]">
          Showing 1–{mobileEnd} of {total}
        </p>
        {canLoadMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            className={cn(adminSecondaryButtonClass, "w-full")}
          >
            Load More
          </button>
        ) : null}
      </div>
    </div>
  );
}
