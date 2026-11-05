import { Check, X } from "lucide-react";
import { orderTimeline } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Four-step settlement stepper: placed → payment → delivery → settled. */
export function OrderTimeline({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const steps = orderTimeline(status);
  return (
    <ol
      className={cn("grid gap-4 sm:grid-cols-4 sm:gap-0", className)}
      aria-label="Order progress"
    >
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li
            key={step.key}
            className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2"
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute hidden h-px sm:left-8 sm:right-2 sm:top-3.5 sm:block",
                  step.state === "done" ? "bg-emerald-500" : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular",
                step.state === "done" &&
                  "border-emerald-500 bg-emerald-500 text-white",
                step.state === "current" &&
                  "border-brand bg-amber-50 text-amber-700",
                step.state === "upcoming" &&
                  "border-border bg-card text-muted-foreground",
                step.state === "failed" &&
                  "border-red-500 bg-red-50 text-red-600",
              )}
            >
              {step.state === "current" ? (
                <span className="absolute inset-0 animate-ping rounded-full bg-amber-300/40" />
              ) : null}
              {step.state === "done" ? (
                <Check className="size-3.5" aria-hidden />
              ) : step.state === "failed" ? (
                <X className="size-3.5" aria-hidden />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0">
              <div
                className={cn(
                  "text-sm font-medium",
                  step.state === "upcoming"
                    ? "text-muted-foreground"
                    : step.state === "failed"
                      ? "text-red-700"
                      : "text-ink",
                )}
              >
                {step.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {
                  {
                    done: "Completed",
                    current: "In progress",
                    upcoming: "Pending",
                    failed: "Interrupted",
                  }[step.state]
                }
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
