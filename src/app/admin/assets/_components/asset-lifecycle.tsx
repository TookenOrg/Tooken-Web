import { Check, Circle } from "lucide-react";
import { TookenLoader } from "@/components/app/tooken-loader";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "draft", label: "Draft", hint: "Data entry & review" },
  { key: "published", label: "Published", hint: "ERC-3643 token deployed" },
  { key: "fundraising", label: "Fundraising", hint: "Open for subscription" },
  { key: "funded", label: "Funded", hint: "Primary market closed" },
] as const;

const ORDER: Record<string, number> = {
  draft: 0,
  in_review: 0,
  published: 1,
  fundraising: 2,
  funded: 3,
  closed: 4,
};

/** Draft → Published → Fundraising → Funded, as a horizontal stepper. */
export function AssetLifecycle({
  status,
  pendingStep,
}: {
  status: string | undefined;
  /** Index of a step currently being reached (e.g. while publishing). */
  pendingStep?: number;
}) {
  if (status === "cancelled") {
    return (
      <p className="text-sm text-red-700">
        This asset has been cancelled and is kept for audit purposes only.
      </p>
    );
  }
  const reached = ORDER[status ?? "draft"] ?? 0;
  return (
    <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STEPS.map((step, i) => {
        const done = i < reached || (i === reached && reached === 3);
        const current = i === reached && !done;
        const pending = pendingStep === i;
        return (
          <li
            key={step.key}
            aria-current={current ? "step" : undefined}
            className="relative flex items-start gap-3"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular",
                done && "border-emerald-600 bg-emerald-600 text-white",
                current && "border-ink bg-ink text-white",
                pending && "border-brand bg-amber-50 text-amber-700",
                !done &&
                  !current &&
                  !pending &&
                  "border-border bg-card text-muted-foreground",
              )}
            >
              {pending ? (
                <TookenLoader size={14} />
              ) : done ? (
                <Check className="size-3.5" />
              ) : current ? (
                <Circle className="size-2.5 fill-current" />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  done || current ? "text-ink" : "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.hint}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
