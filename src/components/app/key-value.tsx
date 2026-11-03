import { cn } from "@/lib/utils";

export type KeyValueItem = {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  mono?: boolean;
};

/** Two-column definition list, the standard way to show record details. */
export function KeyValueList({
  items,
  className,
  columns = 1,
}: {
  items: KeyValueItem[];
  className?: string;
  columns?: 1 | 2;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-8",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {items.map((item, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: items have no identity of their own
          key={i}
          className="flex items-start justify-between gap-4 border-b border-dashed border-border py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
        >
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "min-w-0 text-right text-sm font-medium text-ink tabular",
              item.mono && "font-mono text-xs",
            )}
          >
            {item.value}
            {item.hint ? (
              <div className="text-xs font-normal text-muted-foreground">
                {item.hint}
              </div>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
