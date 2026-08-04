interface PageContainerProps {
  title: string;
  description?: string;
  /** Optional muted helper line under the description (e.g. autosave hint). */
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function PageContainer({
  title,
  description,
  note,
  action,
  children,
}: PageContainerProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--brand-text)] sm:text-2xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">{description}</p>
          )}
          {note && (
            <p className="mt-1.5 text-xs text-[var(--brand-text-muted)]">{note}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
