import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientsListEmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
}

export function ClientsListEmptyState({
  hasFilters,
  onClearFilters,
}: ClientsListEmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-[var(--brand-purple)]/[0.08] bg-white px-6 py-16 text-center shadow-[0_4px_24px_rgba(93,80,122,0.04)]">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--brand-purple)]/12 bg-[var(--brand-purple-light)]/60">
        <Users
          className="h-7 w-7 text-[var(--brand-purple)]/70"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
      <h2 className="font-heading text-xl font-semibold tracking-tight text-[var(--brand-text)]">
        {hasFilters ? "No clients match your filters" : "No clients yet"}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-[var(--brand-text-muted)]">
        {hasFilters
          ? "Try adjusting search or filters to find the client you’re looking for."
          : "Client profiles will appear here once people book or are added to the clinic."}
      </p>
      {hasFilters && onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
