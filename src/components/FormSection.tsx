import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function FormSection({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden gap-0 rounded-xl border-border py-0 shadow-none">
      <div className="border-b border-border bg-muted/40 px-6 py-4">
        <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="px-6 py-6">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          {footer}
        </div>
      )}
    </Card>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-foreground/80 flex items-center gap-1"
      >
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
