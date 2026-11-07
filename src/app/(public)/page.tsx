"use client";

import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  estateCover,
  estateLocation,
  RealEstateCard,
} from "@/components/app/real-estate-card";
import { EmptyState, ErrorState } from "@/components/app/states";
import { RealEstateStatusBadge } from "@/components/app/status-badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealEstates } from "@/lib/api/hooks";
import { homeFor } from "@/lib/auth/routes";
import { useSession } from "@/lib/auth/session-context";
import { addDecimal, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const LISTED = ["published", "fundraising", "funded", "closed"];
const STEPS = [
  {
    title: "Understand the asset.",
    text: "Explore the underlying asset and the available offering information. Tokens represent shares; the rights attached to those shares depend on the issuing vehicle and its legal documents.",
  },
  {
    title: "Make it yours.",
    text: "Create your account, complete identity verification and subscribe to an available offering.",
  },
  {
    title: "Keep a clear view.",
    text: "Follow your orders, payment instructions and delivered shares in your investor workspace. Distributions depend on the offering and are not guaranteed.",
  },
];

export default function LandingPage() {
  const session = useSession();
  const [slide, setSlide] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);
  const { data, isLoading, isError, error, refetch } = useRealEstates();
  const estates = data ?? [];
  const offerings = useMemo(
    () =>
      estates
        .filter((e) => e.status === "fundraising" || e.status === "published")
        .sort(
          (a, b) =>
            Number(b.status === "fundraising") -
            Number(a.status === "fundraising"),
        ),
    [estates],
  );
  const featured = offerings.slice(0, 3);
  const metrics = useMemo(() => {
    const listed = estates.filter((e) => LISTED.includes(e.status ?? ""));
    const byCurrency = new Map<string, string>();
    let missingValuation = false;
    for (const estate of listed) {
      const value = estate.configuration?.total_valuation;
      const currency = estate.configuration?.currency_code;
      if (!value || !currency) {
        missingValuation = true;
        continue;
      }
      try {
        byCurrency.set(
          currency,
          addDecimal(byCurrency.get(currency) ?? "0", value),
        );
      } catch {
        missingValuation = true;
      }
    }
    return {
      count: listed.length,
      open: listed.filter((e) => e.status === "fundraising").length,
      valuations: [...byCurrency.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
      ),
      mixed: byCurrency.size > 1,
      missingValuation,
    };
  }, [estates]);
  const slides = offerings.filter((estate) => estateCover(estate));
  const activeSlide = slides.length ? slide % slides.length : 0;
  const hero = slides[activeSlide];
  const cover = hero ? estateCover(hero) : undefined;
  const rotating =
    slides.length > 1 && !hovered && !focused && !reducedMotion && visible;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(
      () => setSlide((activeSlide + 1) % slides.length),
      8000,
    );
    return () => window.clearTimeout(timer);
  }, [rotating, activeSlide, slides.length]);

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 lg:pt-14">
          <div className="grid items-center gap-10 pb-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-16">
            <div className="py-2 lg:py-8">
              <h1 className="max-w-2xl font-editorial text-[clamp(3.2rem,6.6vw,5.75rem)] leading-[0.98] font-normal tracking-[-0.055em] text-ink">
                Real-world assets.
                <br />
                <em className="font-normal">Tokenized.</em>
              </h1>
              <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                Explore offerings based on real estate assets. Verify your
                identity before subscribing, then follow your orders and
                delivered shares in your investor workspace.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Button asChild size="lg" className="h-12 px-6">
                  <Link href="/explore">
                    Explore the offerings <ArrowUpRight />
                  </Link>
                </Button>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 text-sm text-ink underline underline-offset-4 hover:text-muted-foreground"
                >
                  How it works <ArrowDown className="size-3.5" aria-hidden />
                </Link>
              </div>
              <p className="mt-8 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Capital at risk. Returns are not guaranteed. Offering documents
                are not currently available here.
              </p>
            </div>
            <figure
              className="min-w-0"
              aria-label="Featured assets"
              aria-roledescription="carousel"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocusCapture={() => setFocused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setFocused(false);
              }}
            >
              <div className="relative aspect-[5/4] overflow-hidden bg-muted lg:aspect-[5/5.3]">
                {cover && hero ? (
                  slides.map((estate, index) => (
                    <div
                      key={estate.id}
                      aria-hidden={index !== activeSlide}
                      className={cn(
                        "absolute inset-0 transition-opacity duration-[1500ms] ease-in-out motion-reduce:transition-none",
                        index === activeSlide
                          ? "opacity-100"
                          : "pointer-events-none opacity-0",
                      )}
                    >
                      <Image
                        src={estateCover(estate) as string}
                        alt={estate.title || "Featured asset"}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className={cn(
                          "object-cover transition-transform duration-[8000ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
                          index === activeSlide ? "scale-[1.04]" : "scale-100",
                        )}
                        priority={index === 0}
                        loading={index > 0 ? "eager" : undefined}
                      />
                    </div>
                  ))
                ) : (
                  <div className="flex h-full flex-col justify-between bg-ink p-7 text-white sm:p-10">
                    <p className="font-mono text-xs text-white/65">
                      RWA / REAL-WORLD ASSETS
                    </p>
                    <div className="py-8">
                      <p className="font-editorial text-4xl leading-tight tracking-tight sm:text-5xl">
                        The asset is real.
                        <br />
                        <em className="text-brand">Ownership evolves.</em>
                      </p>
                      <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/70">
                        A common token standard. An offering structure defined
                        for each asset.
                      </p>
                    </div>
                    <p className="border-t border-white/20 pt-5 text-xs text-white/70">
                      ERC-3643 · Permissioned ownership
                    </p>
                  </div>
                )}
                {cover && hero ? (
                  <div className="absolute top-4 left-4">
                    <RealEstateStatusBadge status={hero.status} />
                  </div>
                ) : null}
                {cover ? (
                  <span className="absolute right-4 bottom-4 bg-background px-2.5 py-1.5 font-mono text-[10px] text-ink">
                    ASSET SPOTLIGHT
                  </span>
                ) : null}
              </div>
              <figcaption
                aria-live={rotating ? "off" : "polite"}
                aria-atomic="true"
                className="flex min-h-20 items-start justify-between gap-4 border-b border-border py-4"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {cover && hero
                      ? hero.title
                      : "One standard. A wider asset universe."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cover && hero
                      ? estateLocation(hero) || "View offering details"
                      : "Platform overview. Not an investment offering."}
                  </p>
                </div>
                {cover && hero ? (
                  <Link
                    href={`/real-estate/${hero.id}`}
                    aria-label={`View ${hero.title || "featured asset"}`}
                    className="rounded-sm p-2 text-ink hover:bg-muted"
                  >
                    <ArrowUpRight className="size-5" />
                  </Link>
                ) : null}
              </figcaption>
            </figure>
          </div>
          <dl className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                label: "Listed offerings",
                value: formatNumber(metrics.count),
              },
              {
                label: metrics.missingValuation
                  ? "Known listed asset values"
                  : metrics.mixed
                    ? "Listed asset values by currency"
                    : "Total listed asset value",
                value: metrics.valuations.length
                  ? metrics.valuations.map(([currency, value]) => (
                      <span key={currency} className="block">
                        {formatMoney(value, currency, { compact: true })}
                      </span>
                    ))
                  : "—",
              },
              {
                label: "Open for subscription",
                value: formatNumber(metrics.open),
              },
            ].map(({ label, value }) => (
              <div key={label} className="py-5 sm:px-6 sm:first:pl-0 lg:py-7">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-2 text-3xl tracking-tight text-ink tabular">
                  {isLoading ? (
                    <Skeleton className="h-9 w-24" />
                  ) : isError ? (
                    "—"
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              01 — The offerings
            </p>
            <h2 className="mt-3 font-editorial text-4xl font-normal tracking-tight text-ink sm:text-5xl">
              Explore the underlying assets.
            </h2>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-3 border-b border-ink pb-1 text-sm text-ink hover:text-muted-foreground"
          >
            All offerings <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-9">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {["a", "b", "c"].map((key) => (
                <Skeleton key={key} className="h-96" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              error={error}
              title="Unable to load offerings"
              onRetry={() => refetch()}
            />
          ) : featured.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((estate) => (
                <RealEstateCard key={estate.id} estate={estate} />
              ))}
            </div>
          ) : (
            <div className="border-y border-border">
              <EmptyState
                title="The next chapter is taking shape."
                description="No offerings are open at the moment. Available assets will appear here when published."
              />
            </div>
          )}
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-24 border-y border-border bg-white"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24 lg:py-24">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              02 — A clearer path
            </p>
            <h2 className="mt-4 max-w-md font-editorial text-4xl leading-[1.1] font-normal tracking-tight text-ink sm:text-5xl">
              From an asset
              <br />
              to your portfolio.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Digital ownership should make the process easier to follow. Not
              harder to understand.
            </p>
            {session.ready ? (
              <Link
                href={
                  session.isAuthenticated ? homeFor(session.role) : "/sign-up"
                }
                className="mt-7 inline-flex items-center gap-3 text-sm font-medium text-ink underline underline-offset-4"
              >
                {session.isAuthenticated
                  ? session.isStaff
                    ? "Back office"
                    : "Dashboard"
                  : "Open an account"}{" "}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : null}
          </div>
          <ol className="divide-y divide-border">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-6 py-7 first:pt-0 last:pb-0"
              >
                <span className="pt-1 font-mono text-xs text-amber-700">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-medium text-ink">{step.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="institutions"
        className="scroll-mt-24 border-b border-border bg-background text-ink"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              03 — For the people behind the assets
            </p>
            <h2 className="mt-3 font-editorial text-3xl font-normal tracking-tight sm:text-4xl">
              For issuers &amp; asset managers
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Manage offerings and the work around investor verification and
              subscription orders in the back office.
            </p>
          </div>
          <dl className="divide-y divide-border border-y border-border">
            {[
              [
                "Offering setup",
                "Configure assets, shares and issuer details.",
              ],
              [
                "Investor verification",
                "Review verification files and registration status.",
              ],
              [
                "Orders & settlement",
                "Track subscriptions and their settlement.",
              ],
            ].map(([label, text]) => (
              <div
                key={label}
                className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4"
              >
                <dt className="text-sm font-medium">{label}</dt>
                <dd className="text-sm text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-10 sm:px-8 lg:grid-cols-2 lg:gap-16">
          <h2 className="text-lg font-medium text-ink">About ERC-3643</h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              ERC-3643 supports permissioned tokens with identity and transfer
              checks. These technical controls do not establish financial
              returns or legal rights.
            </p>
            <p>
              Real estate is the offering category available today. Broader
              real-world asset tokenization remains a direction, with each
              category requiring its own structure and offering terms.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-center lg:py-20">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Your next perspective
          </p>
          <h2 className="mt-3 font-editorial text-4xl font-normal tracking-tight text-ink sm:text-5xl">
            Start with the asset.
          </h2>
        </div>
        <Button asChild size="lg" className="h-12 px-6">
          <Link href="/explore">
            Explore the marketplace <ArrowUpRight />
          </Link>
        </Button>
      </section>
    </>
  );
}
