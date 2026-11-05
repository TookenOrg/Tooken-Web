import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading,
  accent = "ink",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  loading?: boolean;
  accent?: "ink" | "brand" | "signal" | "success";
  className?: string;
}) {
  const accents = {
    ink: "bg-ink/5 text-ink",
    brand: "bg-amber-50 text-amber-600",
    signal: "bg-cyan-50 text-cyan-700",
    success: "bg-emerald-50 text-emerald-700",
  } as const;
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-[0_1px_2px_rgb(16_24_40/0.04)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-md",
              accents[accent],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-ink tabular">
        {loading ? <Skeleton className="h-7 w-28" /> : value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
