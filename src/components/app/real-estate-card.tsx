import { Building2, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RealEstate, RealEstateSummary } from "@/lib/api/types";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { countryName, estateTypeLabel } from "@/lib/reference";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import { RealEstateStatusBadge } from "./status-badges";

type Estate = RealEstateSummary | RealEstate;

/** Cover image: the flagged cover media, the first media, then `imageurl`. */
export function estateCover(estate: Estate): string | undefined {
  const media = "media" in estate ? (estate.media ?? []) : [];
  const images = media.filter(
    (m) => m.url && (m.media_type ?? "image") === "image",
  );
  return (
    images.find((m) => m.is_cover)?.url ??
    images[0]?.url ??
    estate.imageurl ??
    undefined
  );
}

/** Subscribed share of the offering in percent, or null when unknown. */
export function fundingPercent(estate: Estate): number | null {
  const p = estate.progression;
  if (
    typeof p?.tokens_sold_pctg === "number" &&
    Number.isFinite(p.tokens_sold_pctg)
  ) {
    return Math.min(100, Math.max(0, p.tokens_sold_pctg));
  }
  const total = Number(estate.configuration?.total_shares);
  if (typeof p?.tokens_sold === "number" && total > 0) {
    return Math.min(100, Math.max(0, (p.tokens_sold / total) * 100));
  }
  return null;
}

export function estateLocation(estate: Estate): string | null {
  const parts = [
    estate.location?.city,
    estate.location?.country_code
      ? countryName(estate.location.country_code)
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-sm font-semibold text-ink tabular",
          emphasis && "text-emerald-700",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Marketplace tile for an offering, in a grid (default) or a list row. */
export function RealEstateCard({
  estate,
  layout = "grid",
  href,
  className,
  showFavorite = true,
  priority,
}: {
  estate: Estate;
  layout?: "grid" | "list";
  href?: string;
  className?: string;
  showFavorite?: boolean;
  priority?: boolean;
}) {
  const cover = estateCover(estate);
  const cfg = estate.configuration;
  const currency = cfg?.currency_code || "EUR";
  const funded = fundingPercent(estate);
  const location = estateLocation(estate);
  const link = href ?? `/real-estate/${estate.id}`;
  const title = estate.title || `Offering #${estate.id}`;
  const list = layout === "list";

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)] transition hover:border-ink/20 hover:shadow-md focus-within:ring-2 focus-within:ring-ring",
        list ? "flex-col sm:flex-row" : "flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-ink",
          list ? "aspect-[16/9] sm:aspect-auto sm:w-64" : "aspect-[16/10]",
        )}
      >
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            priority={priority}
            sizes={
              list
                ? "(min-width: 640px) 256px, 100vw"
                : "(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
            }
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="bg-animated-gradient-dark flex size-full items-center justify-center">
            <Building2 className="size-10 text-white/25" aria-hidden />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <RealEstateStatusBadge status={estate.status} />
        </div>
        {showFavorite ? (
          <div className="absolute top-3 right-3 z-10">
            <FavoriteButton realEstateId={estate.id} />
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {estateTypeLabel(estate.estate_type, estate.estate_type_id)}
        </p>
        <h3 className="mt-1 truncate text-base font-semibold text-ink">
          <Link
            href={link}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {title}
          </Link>
        </h3>
        {location ? (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden /> {location}
          </p>
        ) : null}

        <dl
          className={cn(
            "mt-4 grid gap-3 border-t border-border pt-4",
            list ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3",
          )}
        >
          <Metric
            label="Per share"
            value={formatMoney(cfg?.price_per_share, currency)}
          />
          <Metric
            label="Yield"
            value={
              typeof cfg?.yield === "number" ? formatPercent(cfg.yield) : "—"
            }
            emphasis
          />
          <Metric
            label="Valuation"
            value={formatMoney(cfg?.total_valuation, currency, {
              compact: true,
            })}
          />
          {list ? (
            <Metric
              label="Total shares"
              value={formatNumber(cfg?.total_shares)}
            />
          ) : null}
        </dl>

        {funded !== null ? (
          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Subscribed</span>
              <span className="font-medium text-ink tabular">
                {formatPercent(funded, funded > 0 && funded < 1 ? 1 : 0)}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
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
      </div>
    </article>
  );
}
