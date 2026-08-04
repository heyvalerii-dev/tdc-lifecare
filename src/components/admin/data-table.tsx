import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, keyField, emptyMessage = "No data" }: DataTableProps<T>) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--brand-text-muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--brand-purple)]/15 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--brand-purple)]/10 bg-[var(--brand-cream)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-4 py-3 text-left font-medium text-[var(--brand-text-muted)]", col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--brand-purple)]/10">
          {data.map((row) => (
            <tr key={String(row[keyField])} className="hover:bg-[var(--brand-cream)]">
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3", col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
