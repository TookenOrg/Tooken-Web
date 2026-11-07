"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortenHash } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Shortened address or transaction hash with a copy button. */
export function HashValue({
  value,
  size = 6,
  className,
  full,
}: {
  value: string | null | undefined;
  size?: number;
  className?: string;
  full?: boolean;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  if (!value) return <span className="text-muted-foreground">—</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 font-mono text-xs",
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("truncate", full && "break-all whitespace-normal")}
          >
            {full ? value : shortenHash(value, size)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-none font-mono text-xs">
          {value}
        </TooltipContent>
      </Tooltip>
      <button
        type="button"
        onClick={copy}
        className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Copy to clipboard"
      >
        {copyState === "copied" ? (
          <Check className="size-3.5 text-emerald-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      <output className="sr-only">
        {copyState === "copied"
          ? "Copied to clipboard"
          : copyState === "failed"
            ? "Copy failed"
            : ""}
      </output>
    </span>
  );
}
