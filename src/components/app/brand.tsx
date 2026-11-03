import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-transparent_3000.png"
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
        <span className="rounded border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
          {suffix}
        </span>
      ) : null}
    </Link>
  );
}
