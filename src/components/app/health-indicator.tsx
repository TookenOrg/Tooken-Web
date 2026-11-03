"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHealth } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/** Live status of the API, polled from /health. */
export function HealthIndicator({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const { data, isError, isLoading } = useHealth();
  const ok = !isError && data?.status === "ok";
  const label = isLoading
    ? "Checking services…"
    : ok
      ? "All systems operational"
      : "Service disruption";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
            tone === "dark"
              ? "bg-white/5 text-white/70"
              : "bg-muted text-muted-foreground",
            className,
          )}
        >
          <span className="relative flex size-2">
            {ok ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            ) : null}
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                isLoading
                  ? "bg-slate-400"
                  : ok
                    ? "bg-emerald-500"
                    : "bg-red-500",
              )}
            />
          </span>
          <span className="hidden lg:inline">
            {ok ? "Operational" : isLoading ? "Checking" : "Degraded"}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {data?.version ? ` · API ${data.version}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}
