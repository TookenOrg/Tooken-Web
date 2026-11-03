"use client";

import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  FileBarChart,
  Fingerprint,
  KeyRound,
  Landmark,
  Network,
  ScrollText,
  ShieldCheck,
  Vault,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import {
  fundingPercent,
  RealEstateCard,
} from "@/components/app/real-estate-card";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealEstates } from "@/lib/api/hooks";
import type { RealEstateSummary } from "@/lib/api/types";
import {
  addDecimal,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/format";

const LISTED = ["published", "fundraising", "funded", "closed"];

function computeMetrics(estates: RealEstateSummary[]) {
  const listed = estates.filter((e) => LISTED.includes(e.status ?? ""));
  const byCurrency = new Map<string, string>();
  for (const e of listed) {
    const v = e.configuration?.total_valuation;
    if (!v) continue;
    const ccy = e.configuration?.currency_code || "EUR";
    try {
      byCurrency.set(ccy, addDecimal(byCurrency.get(ccy) ?? "0", v));
    } catch {
      // Ignore malformed amounts rather than breaking the whole strip.
    }
  }
  // With several currencies, report the largest book only.
  const [currency, valuation] = [...byCurrency.entries()].sort(
    (a, b) => Number(b[1]) - Number(a[1]),
  )[0] ?? ["EUR", null];
  const yields = listed
    .map((e) => e.configuration?.yield)
    .filter((y): y is number => typeof y === "number" && Number.isFinite(y));
  const avgYield = yields.length
    ? yields.reduce((s, y) => s + y, 0) / yields.length
    : null;
  return {
    count: listed.length,
    open: listed.filter((e) => e.status === "fundraising").length,
    valuation,
    currency,
    mixedCurrencies: byCurrency.size > 1,
    avgYield,
  };
}

const STEPS = [
  {
    icon: Building2,
    title: "Originate",
    text: "Onboard the issuing vehicle and the asset: valuation, specification, documentation and share structure.",
  },
  {
    icon: KeyRound,
    title: "Tokenize",
    text: "Deploy an ERC-3643 security token with its compliance module and identity registry in a single step.",
  },
  {
    icon: Network,
    title: "Distribute",
    text: "Open subscriptions to verified investors. Eligibility is checked on-chain before every transfer.",
  },
  {
    icon: Banknote,
    title: "Settle",
    text: "Confirm the cash leg, then tokens are delivered automatically with a full audit trail.",
  },
];

const PILLARS = [
  {
    icon: ScrollText,
    title: "Compliance by design",
    text: "Transfer rules, investor caps and jurisdiction restrictions are enforced by the token itself, not by after-the-fact controls.",
  },
  {
    icon: Fingerprint,
    title: "On-chain identity & KYC",
    text: "Each investor holds an ONCHAINID with claims signed by your compliance team. Revocation is immediate and auditable.",
  },
  {
    icon: Vault,
    title: "Custody & control",
    text: "Issuer-controlled agent roles allow forced transfers, freezes and recovery in line with your regulatory obligations.",
  },
  {
    icon: FileBarChart,
    title: "Reporting",
    text: "Real-time cap table, order book and settlement history ready for investors, auditors and supervisors.",
  },
];

const TRUST = [
  { icon: ShieldCheck, label: "ERC-3643 / T-REX standard" },
  { icon: BadgeCheck, label: "KYC / AML workflows" },
  { icon: Landmark, label: "Regulated issuing vehicles" },
  { icon: KeyRound, label: "Idempotent, audited settlement" },
];

function Metric({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="px-5 py-6 sm:px-8">
      <dt className="text-xs font-medium uppercase tracking-wider text-white/50">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-white tabular sm:text-3xl">
        {loading ? <Skeleton className="h-8 w-28 bg-white/10" /> : value}
      </dd>
      {hint && !loading ? (
        <dd className="mt-1 text-xs text-white/45">{hint}</dd>
      ) : null}
    </div>
  );
}

function HeroVisual({ estate }: { estate?: RealEstateSummary }) {
  const cfg = estate?.configuration;
  const funded = estate ? fundingPercent(estate) : null;
  return (
    <div className="relative mx-auto w-full max-w-md">
      <Image
        src="/logo-transparent_3000.png"
        alt=""
        width={480}
        height={480}
        priority
        className="animate-float-slower pointer-events-none absolute -top-16 -right-16 w-72 opacity-10"
      />
      <div className="animate-float-slow relative rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-white/50">
            Security token
          </span>
          <span className="rounded border border-signal/30 bg-signal/10 px-2 py-0.5 font-mono text-[11px] text-signal">
            ERC-3643
          </span>
        </div>
        <p className="mt-4 text-lg font-semibold text-white">
          {estate?.title ?? "Prime residential, Luxembourg"}
        </p>
        <p className="mt-1 font-mono text-xs text-white/40">
          {estate?.contract_address
            ? `${estate.contract_address.slice(0, 10)}…${estate.contract_address.slice(-6)}`
            : "0x0000…tokenized"}
        </p>
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          <div>
            <dt className="text-[11px] text-white/45">Per share</dt>
            <dd className="mt-1 text-sm font-semibold text-white tabular">
              {formatMoney(cfg?.price_per_share ?? 250, cfg?.currency_code)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-white/45">Yield</dt>
            <dd className="mt-1 text-sm font-semibold text-emerald-300 tabular">
              {formatPercent(cfg?.yield ?? 4.8)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-white/45">Shares</dt>
            <dd className="mt-1 text-sm font-semibold text-white tabular">
              {formatNumber(cfg?.total_shares ?? 10000)}
            </dd>
          </div>
        </dl>
        <div className="mt-5">
          <div className="flex justify-between text-[11px] text-white/45">
            <span>Subscribed</span>
            <span className="tabular">
              {formatPercent(funded ?? 0, funded && funded < 1 ? 1 : 0)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand"
              style={{
                width: `${Math.max(funded ?? 0, funded ? 2 : 0)}%`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="relative -mt-4 ml-8 flex items-center gap-3 rounded-lg border border-white/10 bg-ink-2 px-4 py-3 shadow-xl">
        <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <BadgeCheck className="size-4" aria-hidden />
        </span>
        <div className="text-xs">
          <p className="font-medium text-white">
            Investor eligibility verified
          </p>
          <p className="text-white/45">KYC claim · topic 7 · on-chain</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { data, isLoading, isError, error, refetch } = useRealEstates();
  const estates = data ?? [];
  const metrics = useMemo(() => computeMetrics(estates), [estates]);
  const featured = useMemo(
    () =>
      estates
        .filter((e) => e.status === "fundraising" || e.status === "published")
        .sort(
          (a, b) =>
            Number(b.status === "fundraising") -
            Number(a.status === "fundraising"),
        )
        .slice(0, 3),
    [estates],
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-animated-gradient-dark relative overflow-hidden text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8 lg:pt-24 lg:pb-28">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="size-1.5 rounded-full bg-signal" aria-hidden />
              Infrastructure for banks and asset managers
            </p>
            <h1 className="mt-6 text-4xl leading-[1.1] font-semibold sm:text-5xl lg:text-[3.4rem]">
              Tokenize real estate under{" "}
              <span className="text-brand">ERC-3643</span>, with compliance
              built in.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
              Issue, distribute and settle fractional interests in
              income-producing property. Every holder is identified, every
              transfer is checked, every settlement is recorded.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-brand text-brand-foreground hover:bg-brand-light"
              >
                <Link href="/explore">
                  Explore offerings <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/sign-up">Request access</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:block">
            <HeroVisual estate={featured[0]} />
          </div>
        </div>

        {/* Live metrics */}
        <div className="border-t border-white/10 bg-ink-3/60">
          <dl className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Metric
              label="Listed offerings"
              loading={isLoading}
              value={isError ? "—" : formatNumber(metrics.count)}
              hint={
                isError
                  ? "Live data unavailable"
                  : `${formatNumber(metrics.open)} open for subscription`
              }
            />
            <Metric
              label="Assets tokenized"
              loading={isLoading}
              value={
                metrics.valuation
                  ? formatMoney(metrics.valuation, metrics.currency, {
                      compact: true,
                    })
                  : "—"
              }
              hint={
                metrics.mixedCurrencies
                  ? `Total valuation, ${metrics.currency} book`
                  : "Total valuation"
              }
            />
            <Metric
              label="Average target yield"
              loading={isLoading}
              value={
                metrics.avgYield !== null
                  ? formatPercent(metrics.avgYield)
                  : "—"
              }
              hint="Simple average across listed offerings"
            />
          </dl>
        </div>
      </section>

      {/* Featured */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                Marketplace
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
                Featured offerings
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/explore">
                View all offerings <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-8">
            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {["a", "b", "c"].map((k) => (
                  <Skeleton key={k} className="h-96 rounded-lg" />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-lg border border-border bg-card">
                <ErrorState
                  error={error}
                  title="Unable to load offerings"
                  onRetry={() => refetch()}
                />
              </div>
            ) : featured.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  icon={Building2}
                  title="No offering open at the moment"
                  description="New tokenized assets are published regularly. Create an account to be notified."
                />
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((e) => (
                  <RealEstateCard key={e.id} estate={e} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-16 border-y border-border bg-white"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
              How it works
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
              From asset to settled security token in four steps
            </h2>
            <p className="mt-3 text-muted-foreground">
              One workflow covers the full lifecycle, from the issuing vehicle
              to delivery of tokens in the investor&apos;s wallet.
            </p>
          </div>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-md bg-ink text-brand">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Institutions */}
      <section id="institutions" className="scroll-mt-16 bg-background">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
              For institutions
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
              Built for banks, asset managers and fund administrators
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tooken gives your teams a back office to structure offerings,
              review investor files and supervise settlement, while the ERC-3643
              standard guarantees that only eligible investors can ever hold
              your tokens.
            </p>
            <Button asChild className="mt-8 bg-ink text-white hover:bg-ink-2">
              <Link href="/sign-up">
                Talk to our team <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-lg border border-border bg-card p-6 shadow-[0_1px_2px_rgb(16_24_40/0.04)]"
              >
                <span className="flex size-9 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                  <Icon className="size-4" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="border-y border-white/5 bg-ink-2 text-white">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          {TRUST.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-3 text-sm text-white/70"
            >
              <Icon className="size-5 shrink-0 text-signal" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Bring your next real estate offering on-chain.
            </h2>
            <p className="mt-3 text-white/60">
              Open an account to access the marketplace, or contact us to
              onboard your institution as an issuer.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-brand text-brand-foreground hover:bg-brand-light"
            >
              <Link href="/sign-up">Request access</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/explore">Explore offerings</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
