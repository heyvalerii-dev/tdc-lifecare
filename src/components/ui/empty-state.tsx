import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-[var(--brand-purple-light)] p-4">
        <Icon className="h-8 w-8 text-[var(--brand-text-muted)]" />
      </div>
      <h3 className="text-base font-medium text-[var(--brand-text)]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-[var(--brand-text-muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
