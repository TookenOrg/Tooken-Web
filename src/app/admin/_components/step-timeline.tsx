import { Check, X } from "lucide-react";
import { TookenLoader } from "@/components/app/tooken-loader";
import type { TimelineStep } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Horizontal (vertical on mobile) progression of an order or a KYC file. */
export function StepTimeline({
  steps,
  live,
}: {
  steps: (TimelineStep & { hint?: React.ReactNode })[];
  /** Animates the current step while the backend is still moving it. */
  live?: boolean;
}) {
  return (
    <ol className="grid gap-4 sm:grid-flow-col sm:auto-cols-fr sm:gap-2">
      {steps.map((step, i) => (
        <li
          key={step.key}
          className="relative flex gap-3 sm:flex-col sm:gap-2"
          aria-current={step.state === "current" ? "step" : undefined}
        >
          {i < steps.length - 1 ? (
            <span
              aria-hidden
              className={cn(
                "absolute top-8 bottom-[-1rem] left-[13px] w-px sm:top-[13px] sm:right-[-0.5rem] sm:bottom-auto sm:left-9 sm:h-px sm:w-auto",
                step.state === "done" ? "bg-emerald-400" : "bg-border",
              )}
            />
          ) : null}
          <span
            className={cn(
              "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              step.state === "done" &&
                "border-emerald-500 bg-emerald-500 text-white",
              step.state === "current" &&
                "border-brand bg-amber-50 text-amber-700",
              step.state === "upcoming" &&
                "border-border bg-card text-muted-foreground",
              step.state === "failed" && "border-red-500 bg-red-500 text-white",
            )}
          >
            {step.state === "done" ? (
              <Check className="size-3.5" aria-hidden />
            ) : step.state === "failed" ? (
              <X className="size-3.5" aria-hidden />
            ) : step.state === "current" && live ? (
              <TookenLoader size={14} />
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
                  : "text-ink",
                step.state === "failed" && "text-red-700",
              )}
            >
              {step.label}
              <span className="sr-only"> ({step.state})</span>
            </div>
            {step.hint ? (
              <div className="text-xs text-muted-foreground tabular">
                {step.hint}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
