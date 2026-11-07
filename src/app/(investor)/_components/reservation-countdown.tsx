"use client";

import { Timer } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { formatCountdown } from "@/lib/portfolio";
import { cn } from "@/lib/utils";
import { useNow } from "./use-now";

/** Live countdown to the end of a share reservation. */
export function ReservationCountdown({
  expiresAt,
  className,
}: {
  expiresAt: string | null | undefined;
  className?: string;
}) {
  const now = useNow(1000, !!expiresAt);
  if (!expiresAt) return null;
  const left = new Date(expiresAt).getTime() - now;
  const elapsed = left <= 0;
  const urgent = !elapsed && left < 3 * 60_000;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border px-4 py-3",
        elapsed
          ? "border-slate-200 bg-slate-50"
          : urgent
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50",
        className,
      )}
      role="timer"
      aria-live="off"
    >
      <Timer
        className={cn(
          "size-5 shrink-0",
          elapsed
            ? "text-slate-500"
            : urgent
              ? "text-red-600"
              : "text-amber-600",
        )}
        aria-hidden
      />
      <div className="min-w-32 flex-1">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {elapsed ? "Reservation elapsed" : "Shares reserved for"}
        </div>
        <div className="text-xs text-muted-foreground">
          {elapsed
            ? "Awaiting status update from the issuer."
            : `Until ${formatDateTime(expiresAt)}`}
        </div>
      </div>
      <div
        className={cn(
          "font-mono text-xl font-semibold tabular",
          elapsed ? "text-slate-500" : urgent ? "text-red-700" : "text-ink",
        )}
      >
        {formatCountdown(left)}
      </div>
    </div>
  );
}
