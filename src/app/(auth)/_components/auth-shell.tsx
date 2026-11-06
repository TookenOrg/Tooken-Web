import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/app/brand";

/** Two-column frame shared by sign-in and sign-up. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <aside className="flex flex-col bg-ink p-6 text-white sm:px-10 lg:w-[46%] lg:p-12">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="hidden flex-1 items-center justify-center py-20 lg:flex">
          <Link
            href="/"
            aria-label="Tooken home"
            className="flex flex-col items-center gap-7 rounded-md p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Image
              src="/tooken-logo-animated.svg"
              width={128}
              height={128}
              alt=""
              unoptimized
            />
            <span className="font-display text-5xl font-semibold tracking-tight">
              Tooken
            </span>
          </Link>
        </div>
        <p className="hidden text-center font-mono text-[10px] tracking-[0.16em] text-white/55 lg:block">
          RWA · ERC-3643
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-white px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <h2 className="font-editorial text-4xl font-normal tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link
              href="/"
              className="inline-flex items-center gap-2 hover:text-ink hover:underline"
            >
              <ArrowLeft className="size-3" aria-hidden /> Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Where to go after authenticating: a safe in-app callback, else the role home. */
export function resolveRedirect(
  callbackUrl: string | null,
  fallback: string,
): string {
  if (!callbackUrl) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(callbackUrl);
  } catch {
    return fallback;
  }
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.startsWith("/\\") ||
    decoded.includes("://") ||
    /^\/(sign-in|sign-up|logout)(\/|\?|$)/.test(decoded)
  ) {
    return fallback;
  }
  return decoded;
}

export const PASSWORD_MAX_BYTES = 72;

export function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}
