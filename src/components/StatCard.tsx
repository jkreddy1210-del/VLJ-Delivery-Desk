import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: string;
  hint?: string;
}) {
  return (
    <Card className="gap-0 rounded-xl border-border p-5 shadow-none transition-shadow hover:shadow-[var(--shadow-elevated)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-eyebrow text-muted-foreground">{label}</p>
        <div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon size={17} />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {delta && <span className="text-success font-medium">{delta} </span>}
        {hint}
      </p>
    </Card>
  );
}
