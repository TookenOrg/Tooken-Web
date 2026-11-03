"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronRight,
  Coins,
  Info,
  Landmark,
  Lock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FavoriteButton } from "@/components/app/favorite-button";
import { HashValue } from "@/components/app/hash-value";
import { KeyValueList } from "@/components/app/key-value";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import {
  estateLocation,
  fundingPercent,
} from "@/components/app/real-estate-card";
import { EmptyState, ErrorState } from "@/components/app/states";
import {
  IssuerStatusBadge,
  KycStatusBadge,
  RealEstateStatusBadge,
} from "@/components/app/status-badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { useRealEstate, useTokenInfos } from "@/lib/api/hooks";
import type { RealEstate, RealEstateMedia } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import {
  formatDate,
  formatFrequency,
  formatMoney,
  formatNumber,
  formatPercent,
  remainingShares,
} from "@/lib/format";
import { countryName, estateTypeLabel } from "@/lib/reference";
import { canInvest } from "@/lib/status";
import { cn } from "@/lib/utils";

function galleryOf(estate: RealEstate): RealEstateMedia[] {
  const media = (estate.media ?? [])
    .filter(
      (m) => m.url && ["image", "floorplan", undefined].includes(m.media_type),
    )
    .sort(
      (a, b) =>
        Number(b.is_cover ?? false) - Number(a.is_cover ?? false) ||
        (a.position ?? 0) - (b.position ?? 0),
    );
  if (media.length === 0 && estate.imageurl) {
    return [{ url: estate.imageurl, alt_text: estate.title }];
  }
  return media;
}

function Gallery({ estate }: { estate: RealEstate }) {
  const items = galleryOf(estate);
  const [index, setIndex] = useState(0);
  const current = items[Math.min(index, items.length - 1)];

  if (!current?.url) {
    return (
      <div className="bg-animated-gradient-dark flex aspect-[16/9] items-center justify-center rounded-lg">
        <Building2 className="size-14 text-white/20" aria-hidden />
        <span className="sr-only">No photo available</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-ink">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt_text || estate.title || "Property photo"}
          fill
          priority
          sizes="(min-width: 1024px) 800px, 100vw"
          className="object-cover"
        />
        {items.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() =>
                setIndex((i) => (i - 1 + items.length) % items.length)
              }
              className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Previous photo"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % items.length)}
              className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Next photo"
            >
              <ArrowRight className="size-4" />
            </button>
            <span className="absolute right-3 bottom-3 rounded bg-ink/80 px-2 py-0.5 text-xs text-white tabular">
              {index + 1} / {items.length}
            </span>
          </>
        ) : null}
      </div>
      {items.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((m, i) => (
            <button
              key={m.id ?? m.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === index
                  ? "border-brand"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={m.url as string}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-4">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-lg font-semibold tracking-tight text-ink tabular",
          accent && "text-emerald-700",
        )}
      >
        {value}
      </dd>
      {hint ? (
        <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>
      ) : null}
    </div>
  );
}

function InvestCard({ estate }: { estate: RealEstate }) {
  const session = useSession();
  const cfg = estate.configuration;
  const currency = cfg?.currency_code || "EUR";
  const funded = fundingPercent(estate);
  const left = remainingShares(
    cfg?.total_shares,
    estate.progression?.tokens_sold,
  );
  const fundraising = estate.status === "fundraising";
  const buyHref = `/real-estate/${estate.id}/buy`;

  let action: React.ReactNode;
  if (!session.ready || (session.isAuthenticated && session.userLoading)) {
    action = <Skeleton className="h-10 w-full" />;
  } else if (!session.isAuthenticated) {
    action = (
      <>
        <Button
          asChild
          className="h-10 w-full bg-brand text-brand-foreground hover:bg-brand-light"
        >
          <Link href={`/sign-in?callbackUrl=${encodeURIComponent(buyHref)}`}>
            <Lock /> Sign in to invest
          </Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          No account yet?{" "}
          <Link
            href={`/sign-up?callbackUrl=${encodeURIComponent(buyHref)}`}
            className="font-medium text-ink hover:underline"
          >
            Open an account
          </Link>
        </p>
      </>
    );
  } else if (session.isStaff) {
    action = (
      <>
        <div className="flex gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Staff accounts cannot subscribe to offerings. Manage this asset from
          the back office.
        </div>
        <Button asChild variant="outline" className="h-10 w-full">
          <Link href={`/admin/assets/${estate.id}`}>
            Open in back office <ChevronRight />
          </Link>
        </Button>
      </>
    );
  } else if (!fundraising) {
    action = (
      <>
        <Button className="h-10 w-full" disabled>
          Subscriptions closed
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {estate.status === "published"
            ? "This offering is published but the subscription period has not opened yet."
            : "This offering is not open for subscription."}
        </p>
      </>
    );
  } else if (
    !canInvest(session.user?.kyc_status, session.user?.kyc_expires_at)
  ) {
    action = (
      <>
        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Identity verification required</p>
            <p className="mt-0.5">
              ERC-3643 tokens can only be held by verified investors.
            </p>
            <div className="mt-2">
              <KycStatusBadge status={session.user?.kyc_status ?? "none"} />
            </div>
          </div>
        </div>
        <Button
          asChild
          className="h-10 w-full bg-brand text-brand-foreground hover:bg-brand-light"
        >
          <Link href="/verification">
            <ShieldCheck /> Complete verification
          </Link>
        </Button>
      </>
    );
  } else if (left <= 0) {
    action = (
      <Button className="h-10 w-full" disabled>
        Fully subscribed
      </Button>
    );
  } else {
    action = (
      <Button
        asChild
        className="h-10 w-full bg-brand text-brand-foreground hover:bg-brand-light"
      >
        <Link href={buyHref}>
          Invest <ArrowRight />
        </Link>
      </Button>
    );
  }

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-border bg-ink px-5 py-4 text-white">
        <p className="text-xs text-white/60">Price per share</p>
        <p className="mt-0.5 text-2xl font-semibold tabular">
          {formatMoney(cfg?.price_per_share, currency)}
        </p>
      </div>
      <PanelBody className="space-y-4">
        {funded !== null ? (
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Subscribed</span>
              <span className="font-semibold text-ink tabular">
                {formatPercent(funded, funded > 0 && funded < 1 ? 1 : 0)}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Subscribed"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(funded)}
            >
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.max(funded, funded > 0 ? 1.5 : 0)}%` }}
              />
            </div>
          </div>
        ) : null}
        <KeyValueList
          items={[
            {
              label: "Target yield",
              value:
                typeof cfg?.yield === "number" ? formatPercent(cfg.yield) : "—",
            },
            {
              label: "Distributions",
              value: formatFrequency(
                cfg?.payment_frequency,
                cfg?.payment_frequency_type,
              ),
            },
            {
              label: "Shares available",
              value: cfg?.total_shares ? formatNumber(left) : "—",
            },
            {
              label: "Max. per investor",
              value: cfg?.max_shares_per_investor
                ? `${formatNumber(cfg.max_shares_per_investor)} shares`
                : "—",
            },
          ]}
        />
        <div className="space-y-2">{action}</div>
        <div className="flex justify-center">
          <FavoriteButton realEstateId={estate.id} withLabel />
        </div>
      </PanelBody>
    </Panel>
  );
}

function TokenPanel({ estate }: { estate: RealEstate }) {
  const address = estate.token?.address || estate.contract_address;
  const infos = useTokenInfos(address || undefined);
  const onChain =
    infos.data && typeof infos.data === "object" ? infos.data : null;

  return (
    <Panel>
      <PanelHeader
        title="Security token"
        description="ERC-3643 (T-REX) permissioned token"
        actions={<Coins className="size-4 text-muted-foreground" aria-hidden />}
      />
      <PanelBody>
        {address ? (
          <>
            <KeyValueList
              items={[
                {
                  label: "Token name",
                  value: estate.token?.token_name ?? onChain?.token_name ?? "—",
                },
                {
                  label: "Symbol",
                  value: estate.token?.symbol ?? onChain?.symbol ?? "—",
                },
                {
                  label: "Decimals",
                  value: estate.token?.nb_decimal ?? onChain?.nbDecimal ?? "—",
                },
                {
                  label: "Contract",
                  value: <HashValue value={address} />,
                },
                ...(onChain?.modularComplianceAddr
                  ? [
                      {
                        label: "Compliance module",
                        value: (
                          <HashValue value={onChain.modularComplianceAddr} />
                        ),
                      },
                    ]
                  : []),
                ...(onChain?.createdAt
                  ? [
                      {
                        label: "Deployed",
                        value: formatDate(onChain.createdAt),
                      },
                    ]
                  : []),
              ]}
            />
            {infos.isLoading ? (
              <Skeleton className="mt-3 h-4 w-48" />
            ) : !onChain ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Live on-chain details are currently unavailable. Figures above
                come from the issuance record.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            The token has not been deployed yet. It is issued when the offering
            is published.
          </p>
        )}
      </PanelBody>
    </Panel>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-9 w-80" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Skeleton className="aspect-[16/9] rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-dashed border-border bg-card">
        <EmptyState
          icon={Building2}
          title="Offering not found"
          description="This offering does not exist or is no longer listed on the marketplace."
          action={
            <Button asChild variant="outline">
              <Link href="/explore">
                <ArrowLeft /> Back to marketplace
              </Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}

export default function RealEstateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const validId = Number.isInteger(id) && id > 0;
  const {
    data: estate,
    isLoading,
    isError,
    error,
    refetch,
  } = useRealEstate(validId ? id : undefined);

  if (!validId) return <NotFoundState />;
  if (isLoading) return <DetailSkeleton />;
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return <NotFoundState />;
    }
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-border bg-card">
          <ErrorState
            error={error}
            title="Unable to load this offering"
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }
  if (!estate) return <NotFoundState />;

  const cfg = estate.configuration;
  const spec = estate.specification;
  const currency = cfg?.currency_code || "EUR";
  const location = estateLocation(estate);
  const title = estate.title || `Offering #${estate.id}`;

  const specItems = [
    spec?.surface_area != null && {
      label: "Surface area",
      value: `${formatNumber(spec.surface_area, 2)} m²`,
    },
    spec?.lot_size != null && {
      label: "Lot size",
      value: `${formatNumber(spec.lot_size, 2)} m²`,
    },
    spec?.terrace_size != null && {
      label: "Terrace",
      value: `${formatNumber(spec.terrace_size, 2)} m²`,
    },
    spec?.pool_size != null && {
      label: "Pool",
      value: `${formatNumber(spec.pool_size, 2)} m²`,
    },
    spec?.bedroom_number != null && {
      label: "Bedrooms",
      value: formatNumber(spec.bedroom_number),
    },
    spec?.bathroom_number != null && {
      label: "Bathrooms",
      value: formatNumber(spec.bathroom_number),
    },
    spec?.build_year != null && {
      label: "Year built",
      value: String(spec.build_year),
    },
    spec?.energy_class && {
      label: "Energy class",
      value: spec.energy_class,
    },
    spec?.ges_class && {
      label: "GHG emissions class",
      value: spec.ges_class,
    },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  const address = estate.address;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/explore" className="hover:text-ink hover:underline">
              Marketplace
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li className="truncate text-ink" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RealEstateStatusBadge status={estate.status} />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {estateTypeLabel(estate.estate_type, estate.estate_type_id)}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
            {title}
          </h1>
          {location ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden /> {location}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Gallery estate={estate} />

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            <Figure
              label="Total valuation"
              value={formatMoney(cfg?.total_valuation, currency, {
                decimals: 0,
              })}
            />
            <Figure
              label="Price per share"
              value={formatMoney(cfg?.price_per_share, currency)}
            />
            <Figure
              label="Target yield"
              value={
                typeof cfg?.yield === "number" ? formatPercent(cfg.yield) : "—"
              }
              accent
            />
            <Figure
              label="Total shares"
              value={formatNumber(cfg?.total_shares)}
            />
            <Figure
              label="Distributions"
              value={formatFrequency(
                cfg?.payment_frequency,
                cfg?.payment_frequency_type,
              )}
            />
            <Figure
              label="Max. per investor"
              value={formatNumber(cfg?.max_shares_per_investor)}
              hint="shares"
            />
          </dl>

          <div className="lg:hidden">
            <InvestCard estate={estate} />
          </div>

          <Panel>
            <PanelHeader title="Investment overview" />
            <PanelBody>
              {estate.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
                  {estate.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description provided by the issuer.
                </p>
              )}
              {estate.published_at ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Published on {formatDate(estate.published_at)}
                </p>
              ) : null}
            </PanelBody>
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel>
              <PanelHeader title="Property specification" />
              <PanelBody className="py-2">
                {specItems.length ? (
                  <KeyValueList items={specItems} />
                ) : (
                  <p className="py-3 text-sm text-muted-foreground">
                    Specification not provided.
                  </p>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Issuer"
                description="Legal vehicle issuing the shares"
                actions={
                  <Landmark
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                }
              />
              <PanelBody className="py-2">
                {estate.issuer ? (
                  <KeyValueList
                    items={[
                      { label: "Name", value: estate.issuer.name ?? "—" },
                      {
                        label: "Legal form",
                        value: estate.issuer.legal_form ?? "—",
                      },
                      {
                        label: "Jurisdiction",
                        value: countryName(estate.issuer.country_code),
                      },
                      {
                        label: "Status",
                        value: (
                          <IssuerStatusBadge status={estate.issuer.status} />
                        ),
                      },
                    ]}
                  />
                ) : (
                  <p className="py-3 text-sm text-muted-foreground">
                    Issuer information not available.
                  </p>
                )}
              </PanelBody>
            </Panel>
          </div>

          <TokenPanel estate={estate} />

          {address ? (
            <Panel>
              <PanelHeader
                title="Registered address"
                description="Visible to staff only"
              />
              <PanelBody className="text-sm text-ink">
                <p>
                  {address.street}
                  {address.street_complement
                    ? `, ${address.street_complement}`
                    : ""}
                </p>
                <p>
                  {address.postal_code} {address.city}
                  {address.region ? `, ${address.region}` : ""}
                </p>
                <p>{countryName(address.country_code)}</p>
              </PanelBody>
            </Panel>
          ) : null}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Investing in tokenized real estate involves risks, including loss of
            capital and limited liquidity. Target yields are not guaranteed.
            Past performance is not a reliable indicator of future results.
          </p>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <InvestCard estate={estate} />
          </div>
        </aside>
      </div>
    </div>
  );
}
