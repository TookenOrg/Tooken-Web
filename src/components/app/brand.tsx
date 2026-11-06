import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
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
  suffix,
  className,
}: {
  href?: string;
  tone?: "light" | "dark";
  suffix?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 font-display", className)}
      aria-label="Tooken home"
    >
      <BrandMark />
      <span
        className={cn(
          "text-xl font-semibold tracking-tight",
          tone === "light" ? "text-white" : "text-ink",
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
