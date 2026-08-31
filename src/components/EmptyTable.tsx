import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";

export function DataPanel({
  title,
  caption,
  toolbar,
  searchPlaceholder,
  children,
}: {
  title?: string;
  caption?: string;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
  children: ReactNode;
}) {
  const hasHeader = title || caption || toolbar || searchPlaceholder;
  return (
    <section className="surface-panel overflow-hidden">
      {hasHeader && (
        <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
            )}
            {caption && <p className="text-xs text-muted-foreground mt-0.5">{caption}</p>}
          </div>
          <div className="flex items-center gap-2">
            {searchPlaceholder && (
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full pl-9 sm:w-64"
                />
              </div>
            )}
            {toolbar}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

export function DataTable({
  columns,
  numericColumns = [],
  children,
}: {
  columns: string[];
  numericColumns?: string[];
  children?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60">
            {columns.map((c) => (
              <th
                key={c}
                className={`px-5 py-3 text-eyebrow text-muted-foreground ${
                  numericColumns.includes(c) ? "text-right" : "text-left"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyTable({
  columns,
  numericColumns,
  title,
  message = "Records will appear here once added.",
  icon,
  action,
  panelTitle,
  caption,
  searchPlaceholder,
  toolbar,
}: {
  columns: string[];
  numericColumns?: string[];
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  panelTitle?: string;
  caption?: string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
}) {
  return (
    <DataPanel
      title={panelTitle}
      caption={caption}
      searchPlaceholder={searchPlaceholder}
      toolbar={toolbar}
    >
      <DataTable columns={columns} numericColumns={numericColumns}>
        <tr>
          <td colSpan={columns.length} className="p-0">
            <EmptyState
              icon={icon}
              title={title ?? "No records found"}
              description={message}
              action={action}
            />
          </td>
        </tr>
      </DataTable>
    </DataPanel>
  );
}
