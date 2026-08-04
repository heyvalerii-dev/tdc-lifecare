export function HomeFooter() {
  return (
    <footer className="border-t border-[var(--brand-border)] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="flex items-center gap-2 text-xs text-[var(--brand-text-muted)]">
          <span
            className="h-px w-3 shrink-0 bg-[var(--brand-yellow)]"
            aria-hidden="true"
          />
          TDC LifeCare · Philippine Time (PHT)
        </p>
      </div>
    </footer>
  );
}
