import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "white";
}) {
  if (variant === "white") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 96 96"
        aria-hidden="true"
        className={cn("size-8 shrink-0", className)}
      >
        <rect
          x="1"
          y="1"
          width="94"
          height="94"
          rx="21"
          fill="#ffffff"
          stroke="#dedfe0"
          strokeWidth="2"
        />
        <rect x="18" y="18" width="18" height="18" rx="4" fill="#2d2b3d" />
        <rect x="39" y="18" width="18" height="18" rx="4" fill="#2d2b3d" />
        <rect x="60" y="18" width="18" height="18" rx="4" fill="#2d2b3d" />
        <rect x="39" y="39" width="18" height="18" rx="4" fill="#2d2b3d" />
        <rect
          x="39"
          y="60"
          width="18"
          height="18"
          rx="4"
          fill="#2d2b3d"
          fillOpacity="0.6"
        />
        <rect x="60" y="60" width="18" height="18" rx="4" fill="#f59e0b" />
      </svg>
    );
  }

  return (
    <Image
      src="/tooken-icon-transparent.svg"
      alt=""
      width={36}
      height={36}
      className={cn("size-8 object-contain", className)}
      priority
    />
  );
}

export function Brand({
  href = "/",
  tone = "light",
  markVariant,
  suffix,
  className,
}: {
  href?: string;
  tone?: "light" | "dark";
  markVariant?: "dark" | "white";
  suffix?: string;
  className?: string;
}) {
  const resolvedMarkVariant =
    markVariant ?? (tone === "light" ? "white" : "dark");
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 font-display", className)}
      aria-label="Tooken home"
    >
      <BrandMark variant={resolvedMarkVariant} />
      <span
        className={cn(
          "text-xl font-semibold tracking-tight",
          tone === "light" ? "text-white" : "text-ink dark:text-white",
        )}
      >
        Tooken
      </span>
      {suffix ? (
        <span
          className={cn(
            "border-l pl-2 text-[9px] font-medium uppercase tracking-wider",
            tone === "light"
              ? "border-white/25 text-white/65"
              : "border-border text-muted-foreground",
          )}
        >
          {suffix}
        </span>
      ) : null}
    </Link>
  );
}
