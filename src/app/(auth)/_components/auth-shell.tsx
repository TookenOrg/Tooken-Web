import { Building2, Fingerprint, Landmark, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/app/brand";

const POINTS = [
  {
    icon: ShieldCheck,
    title: "ERC-3643 permissioned tokens",
    text: "Transfers are enforced on-chain against investor eligibility.",
  },
  {
    icon: Fingerprint,
    title: "On-chain identity",
    text: "KYC claims are bound to an ONCHAINID before any subscription.",
  },
  {
    icon: Landmark,
    title: "Institutional settlement",
    text: "Payment confirmation, delivery and reporting in one workflow.",
  },
];

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
    <div className="flex min-h-screen flex-col bg-ink lg:flex-row">
      <aside className="bg-animated-gradient-dark relative flex flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-10 lg:w-[55%] lg:px-14 lg:py-12">
        <Brand />

        <div className="relative z-10 my-10 max-w-lg lg:my-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Digital securities platform
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Tokenized real estate, built for regulated institutions.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
            Originate, issue and distribute fractional interests in
            income-producing assets with full compliance and transparent
            on-chain records.
          </p>

          <ul className="mt-10 hidden space-y-5 sm:block">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-brand">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-white/55">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 hidden items-center gap-3 text-xs text-white/40 lg:flex">
          <Building2 className="size-4" aria-hidden />
          Luxembourg · Regulated tokenization infrastructure
        </div>

        <Image
          src="/logo-transparent_3000.png"
          alt=""
          width={520}
          height={520}
          priority
          className="animate-float-slower pointer-events-none absolute -right-24 -bottom-24 hidden w-[420px] opacity-[0.07] lg:block"
        />
      </aside>

      <main className="flex flex-1 items-center justify-center bg-white px-5 py-10 sm:px-10 lg:rounded-l-2xl">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold text-ink">{title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-ink hover:underline">
              ← Back to home
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
