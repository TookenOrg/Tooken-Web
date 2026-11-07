"use client";

import { AlertTriangle, Info } from "lucide-react";
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

export function ResultPanel({
  data,
  error,
  emptyLabel = "The backend returned no details for this operation.",
  title = "Response",
  status = "Response received. Check the details for the outcome.",
  endpoint,
  className,
}: {
  data?: unknown;
  error?: unknown;
  emptyLabel?: string;
  title?: string;
  status?: string;
  endpoint?: string;
  className?: string;
}) {
  if (!error && data === undefined && !endpoint) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-3.5" aria-hidden />
            Error
          </div>
          <span className="break-words">{errorMessage(error)}</span>
        </div>
      ) : null}
      {data !== undefined ? (
        <output className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {status}
        </output>
      ) : null}
      {data !== undefined || endpoint ? (
        <details className="rounded-md border border-border bg-muted/40 text-xs">
          <summary className="cursor-pointer rounded-md px-3 py-2 font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Expert details
          </summary>
          <div className="space-y-2 border-t border-border p-3">
            {endpoint ? (
              <p className="break-all font-mono">{endpoint}</p>
            ) : null}
            {data !== undefined ? (
              <div>
                <p className="mb-1 font-semibold text-muted-foreground">
                  {title}
                </p>
                <div className="font-mono">
                  {isEmpty(data) ? (
                    <span className="font-sans text-muted-foreground">
                      {emptyLabel}
                    </span>
                  ) : (
                    <Value value={data} />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
