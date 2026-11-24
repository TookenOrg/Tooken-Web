"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MvpBanner() {
  const pathname = usePathname();
  if (pathname === "/project" || pathname?.startsWith("/project/")) {
    return null;
  }

  return (
    <aside
      aria-label="MVP project notice"
      className="sticky bottom-0 z-30 border-t border-white/10 bg-ink/95 text-white backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs leading-relaxed text-white/80 sm:text-[13px]">
          <span className="inline-flex items-center gap-1.5 border border-brand/35 bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-brand-light">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            MVP
          </span>
          <p>
            <strong className="font-medium text-white">
              Tooken is an independent technical MVP
            </strong>{" "}
            built by Antony LEFEVRE — all offerings and transactions are
            illustrative.
          </p>
        </div>
        <Link
          href="/project"
          className="group inline-flex shrink-0 items-center gap-1.5 self-start text-xs font-medium text-white underline decoration-brand/70 underline-offset-4 transition-colors hover:text-brand-light sm:self-auto sm:text-[13px]"
        >
          About the project &amp; author
          <ArrowUpRight
            className="size-3.5 text-brand-light transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </aside>
  );
}
