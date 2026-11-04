import { cn } from "@/lib/utils";

/** Branded animated loader. Decorative unless a label is given. */
export function TookenLoader({
  size = 48,
  label = "",
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    // biome-ignore lint/performance/noImgElement: animated SVG, nothing to optimize
    <img
      src="/tooken-loader.svg"
      width={size}
      height={size}
      alt={label}
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Centered branded loader for full-page and section loading states. */
export function PageLoader({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <output
      aria-live="polite"
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center gap-4 text-sm text-muted-foreground",
        className,
      )}
    >
      <TookenLoader size={56} />
      <span>{label}</span>
    </output>
  );
}
