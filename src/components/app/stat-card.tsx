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
    ink: "text-muted-foreground",
    brand: "text-amber-700",
    signal: "text-cyan-700",
    success: "text-emerald-700",
  } as const;
  return (
    <div
      className={cn(
        "min-w-0 rounded-md border border-border bg-card p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center",
              accents[accent],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="mt-3 break-words text-lg font-medium tracking-tight text-ink tabular min-[390px]:text-xl sm:mt-5 sm:text-2xl lg:text-3xl">
        {loading ? <Skeleton className="h-7 w-24 sm:w-28" /> : value}
      </div>
      {hint ? (
        <div className="mt-1 break-words text-xs text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
