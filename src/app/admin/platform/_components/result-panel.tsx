"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { HashValue } from "@/components/app/hash-value";
import { errorMessage } from "@/lib/api/client";
import { humanize } from "@/lib/status";
import { cn } from "@/lib/utils";

const HEX = /^0x[0-9a-fA-F]{40}([0-9a-fA-F]{24})?$/;

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "object" && Object.keys(value as object).length === 0)
  );
}

function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "string" && HEX.test(value)) {
    return <HashValue value={value} full />;
  }
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="break-all underline-offset-4 hover:underline"
      >
        {value}
      </a>
    );
  }
  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((v, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: response items have no identity
          <div key={i} className="rounded border border-border/70 p-2">
            <Value value={v} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <dl className="space-y-1.5">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div
            key={k}
            className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]"
          >
            <dt className="text-muted-foreground">{humanize(k)}</dt>
            <dd className="min-w-0 break-all text-ink">
              <Value value={v} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span className="break-all">{String(value)}</span>;
}

/**
 * Monospace panel showing an on-chain operation outcome. Addresses and
 * transaction hashes become copyable; an empty payload is reported as such
 * rather than rendered as a blank box.
 */
export function ResultPanel({
  data,
  error,
  emptyLabel = "The backend returned no details for this operation.",
  title = "Response",
  className,
}: {
  data?: unknown;
  error?: unknown;
  emptyLabel?: string;
  title?: string;
  className?: string;
}) {
  if (!error && data === undefined) return null;
  return (
    <div
      className={cn(
        "rounded-md border font-mono text-xs",
        error
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-border bg-muted/40",
        className,
      )}
      role={error ? "alert" : "status"}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 border-b px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider",
          error
            ? "border-red-200 text-red-700"
            : "border-border text-muted-foreground",
        )}
      >
        {error ? (
          <AlertTriangle className="size-3.5" aria-hidden />
        ) : (
          <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
        )}
        {error ? "Error" : title}
      </div>
      <div className="p-3">
        {error ? (
          <span className="break-words">{errorMessage(error)}</span>
        ) : isEmpty(data) ? (
          <span className="font-sans text-muted-foreground">{emptyLabel}</span>
        ) : (
          <Value value={data} />
        )}
      </div>
    </div>
  );
}
