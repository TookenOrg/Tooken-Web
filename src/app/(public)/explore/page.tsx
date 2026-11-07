"use client";

import { useQueries } from "@tanstack/react-query";
import {
  LayoutGrid,
  List,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { RealEstateCard } from "@/components/app/real-estate-card";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { realEstateApi } from "@/lib/api/endpoints";
import { queryKeys, useRealEstates } from "@/lib/api/hooks";
import type { RealEstateSummary } from "@/lib/api/types";
import { compareDecimal, formatNumber } from "@/lib/format";
import { countryName, ESTATE_TYPES } from "@/lib/reference";
import { REAL_ESTATE_STATUS, realEstateStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

type SortKey =
  | "open-first"
  | "yield-desc"
  | "price-asc"
  | "price-desc"
  | "newest";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "open-first", label: "Open first, newest published" },
  { value: "yield-desc", label: "Highest yield" },
  { value: "price-asc", label: "Price: low to high by currency" },
  { value: "price-desc", label: "Price: high to low by currency" },
  { value: "newest", label: "Newest published" },
];

const YIELD_MAX = 15;
const ALL = "all";

function knownNumber(value: number | undefined | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function publicationTime(value: string | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function compareOptionalNumbers(
  a: number | null,
  b: number | null,
  descending = false,
) {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return descending ? b - a : a - b;
}

function knownPrice(value: string | undefined): string | null {
  const price = value?.trim();
  return price && /^\d+(?:\.\d+)?$/.test(price) ? price : null;
}

function matchesQuery(e: RealEstateSummary, q: string): boolean {
  if (!q) return true;
  const haystack = [
    e.title,
    e.location?.city,
    e.location?.country_code,
    e.location?.country_code ? countryName(e.location.country_code) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en-GB");
  return haystack.includes(q.toLocaleLowerCase("en-GB"));
}

function sortEstates(
  list: RealEstateSummary[],
  sort: SortKey,
  publicationDates: Map<number, string | undefined>,
) {
  return [...list].sort((a, b) => {
    let order = 0;
    if (sort === "open-first" || sort === "newest") {
      if (sort === "open-first") {
        order =
          Number(b.status === "fundraising") -
          Number(a.status === "fundraising");
      }
      order ||= compareOptionalNumbers(
        publicationTime(publicationDates.get(a.id)),
        publicationTime(publicationDates.get(b.id)),
        true,
      );
    } else if (sort === "yield-desc") {
      order = compareOptionalNumbers(
        knownNumber(a.configuration?.yield),
        knownNumber(b.configuration?.yield),
        true,
      );
    } else {
      const aPrice = knownPrice(a.configuration?.price_per_share);
      const bPrice = knownPrice(b.configuration?.price_per_share);
      if (aPrice === null || bPrice === null) {
        order = aPrice === bPrice ? 0 : aPrice === null ? 1 : -1;
      } else {
        const aCurrency = a.configuration?.currency_code?.trim().toUpperCase();
        const bCurrency = b.configuration?.currency_code?.trim().toUpperCase();
        if (!aCurrency || !bCurrency) {
          order = aCurrency === bCurrency ? 0 : aCurrency ? -1 : 1;
        } else {
          order = aCurrency < bCurrency ? -1 : aCurrency > bCurrency ? 1 : 0;
        }
        order ||=
          compareDecimal(aPrice, bPrice) * (sort === "price-desc" ? -1 : 1);
      }
    }
    return order || a.id - b.id;
  });
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const { data, isLoading, isError, error, refetch } = useRealEstates();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [yieldRange, setYieldRange] = useState<[number, number]>([
    0,
    YIELD_MAX,
  ]);
  const [sort, setSort] = useState<SortKey>("open-first");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const estates = data ?? [];

  const statuses = useMemo(
    () => Array.from(new Set(estates.map((e) => e.status).filter(Boolean))),
    [estates],
  ) as string[];

  const yieldActive = yieldRange[0] > 0 || yieldRange[1] < YIELD_MAX;
  const filtersActive =
    !!query.trim() || type !== ALL || status !== ALL || yieldActive;

  const filtered = useMemo(
    () =>
      estates.filter((e) => {
        if (!matchesQuery(e, query.trim())) return false;
        if (type !== ALL && String(e.estate_type_id) !== type) return false;
        if (status !== ALL && e.status !== status) return false;
        if (yieldActive) {
          const y = knownNumber(e.configuration?.yield);
          if (y === null) return false;
          if (y < yieldRange[0]) return false;
          if (yieldRange[1] < YIELD_MAX && y > yieldRange[1]) return false;
        }
        return true;
      }),
    [estates, query, type, status, yieldActive, yieldRange],
  );

  const needsPublicationDates = sort === "open-first" || sort === "newest";
  const publicationQueries = useQueries({
    queries: filtered.map((estate) => ({
      queryKey: [...queryKeys.realEstate(estate.id), "publication-date"],
      queryFn: async () =>
        (await realEstateApi.get(estate.id)).published_at ?? null,
      enabled:
        needsPublicationDates &&
        !isError &&
        Number.isInteger(estate.id) &&
        estate.id > 0,
      retry: false,
      staleTime: 30_000,
    })),
  });
  const publicationDates = new Map<number, string | undefined>(
    filtered.map((estate, index) => [
      estate.id,
      publicationQueries[index]?.data ?? undefined,
    ]),
  );
  const orderingDates =
    needsPublicationDates &&
    publicationQueries.some((result) => result.isLoading);
  const failedDates = needsPublicationDates
    ? publicationQueries.filter(
        (result) => result.isError && result.data === undefined,
      )
    : [];
  const results = sortEstates(filtered, sort, publicationDates);

  const activeFilters = [
    ...(query.trim()
      ? [
          {
            key: "search",
            label: `Search: ${query.trim()}`,
            clear: () => setQuery(""),
          },
        ]
      : []),
    ...(type !== ALL
      ? [
          {
            key: "type",
            label: `Asset type: ${ESTATE_TYPES.find((item) => String(item.id) === type)?.label ?? type}`,
            clear: () => setType(ALL),
          },
        ]
      : []),
    ...(status !== ALL
      ? [
          {
            key: "status",
            label: `Status: ${realEstateStatusMeta(status).label}`,
            clear: () => setStatus(ALL),
          },
        ]
      : []),
    ...(yieldActive
      ? [
          {
            key: "yield",
            label: `Yield: ${yieldRange[0]}–${yieldRange[1] === YIELD_MAX ? `${YIELD_MAX}+` : yieldRange[1]} %`,
            clear: () => setYieldRange([0, YIELD_MAX]),
          },
        ]
      : []),
  ];

  const reset = () => {
    setQuery("");
    setType(ALL);
    setStatus(ALL);
    setYieldRange([0, YIELD_MAX]);
  };

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:py-16">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            The asset collection
          </p>
          <h1 className="mt-3 font-editorial text-[2.4rem] leading-tight font-normal tracking-tight text-ink sm:mt-4 sm:text-6xl">
            Explore the offerings.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-base">
            Compare the available offering information. Subscriptions are
            available to verified investors. Capital at risk.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or city"
              aria-label="Search offerings"
              className="h-11 border-ink/20 bg-white pl-9 sm:h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger
                className="h-11 w-full border-ink/20 bg-white sm:h-9 sm:w-48"
                aria-label="Asset type"
              >
                <SelectValue placeholder="Asset type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All asset types</SelectItem>
                {ESTATE_TYPES.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                className="h-11 w-full border-ink/20 bg-white sm:h-9 sm:w-48"
                aria-label="Status"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {Array.from(
                  new Set([
                    ...statuses,
                    ...Object.keys(REAL_ESTATE_STATUS).filter((s) =>
                      ["published", "fundraising", "funded"].includes(s),
                    ),
                  ]),
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {realEstateStatusMeta(s).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 justify-start border-ink/20 bg-white font-normal sm:h-9",
                    yieldActive && "border-ink/40",
                  )}
                >
                  <SlidersHorizontal />
                  {yieldActive
                    ? `Yield ${yieldRange[0]}–${yieldRange[1] === YIELD_MAX ? `${YIELD_MAX}+` : yieldRange[1]} %`
                    : "Yield: any"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <p className="text-sm font-medium text-ink">Target yield</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Annual gross yield announced by the issuer.
                </p>
                <DualRangeSlider
                  className="mt-6"
                  min={0}
                  max={YIELD_MAX}
                  step={0.5}
                  value={yieldRange}
                  onValueChange={(v) => setYieldRange([v[0], v[1]])}
                  aria-label="Yield range"
                />
                <div className="mt-3 flex justify-between text-xs text-muted-foreground tabular">
                  <span>{formatNumber(yieldRange[0], 1)} %</span>
                  <span>
                    {yieldRange[1] === YIELD_MAX
                      ? `${YIELD_MAX} %+`
                      : `${formatNumber(yieldRange[1], 1)} %`}
                  </span>
                </div>
                {yieldActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setYieldRange([0, YIELD_MAX])}
                  >
                    Clear
                  </Button>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {activeFilters.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Active filters:
            </span>
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.clear}
                aria-label={`Remove ${filter.label} filter`}
                className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-ink/20 bg-white px-3 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate">{filter.label}</span>
                <X className="size-3.5 shrink-0" aria-hidden />
              </button>
            ))}
            <Button
              variant="link"
              size="sm"
              onClick={reset}
              className="h-8 px-1 text-ink"
            >
              Clear filters
            </Button>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isLoading ? (
              "Loading offerings…"
            ) : isError ? (
              "Offerings unavailable"
            ) : (
              <>
                <span className="font-semibold text-ink tabular">
                  {results.length}
                </span>{" "}
                {results.length === 1 ? "offering" : "offerings"}
                {filtersActive ? ` of ${estates.length}` : ""}
              </>
            )}
          </p>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <label
              htmlFor="explore-sort"
              className="text-sm text-muted-foreground"
            >
              Sort by
            </label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger
                id="explore-sort"
                className="h-11 min-w-0 flex-1 border-ink/20 bg-white sm:h-9 sm:w-64 sm:flex-none"
                aria-label="Sort by"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <fieldset
              className="hidden items-center rounded-md border border-border bg-card p-0.5 sm:flex"
              aria-label="Layout"
            >
              <button
                type="button"
                onClick={() => setLayout("grid")}
                aria-pressed={layout === "grid"}
                aria-label="Grid view"
                className={cn(
                  "rounded p-1.5 text-muted-foreground transition hover:text-ink",
                  layout === "grid" && "bg-muted text-ink",
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayout("list")}
                aria-pressed={layout === "list"}
                aria-label="List view"
                className={cn(
                  "rounded p-1.5 text-muted-foreground transition hover:text-ink",
                  layout === "list" && "bg-muted text-ink",
                )}
              >
                <List className="size-4" />
              </button>
            </fieldset>
          </div>
        </div>

        {orderingDates && !isError ? (
          <output className="mt-3 block text-xs text-muted-foreground">
            Ordering offerings by publication date…
          </output>
        ) : failedDates.length && !isError ? (
          <output className="mt-3 block text-xs text-muted-foreground">
            Some publication dates could not be loaded. Affected offerings
            appear after dated offerings within their group.{" "}
            <button
              type="button"
              className="font-medium text-ink underline underline-offset-2"
              onClick={() => {
                for (const result of failedDates) void result.refetch();
              }}
            >
              Retry dates
            </button>
          </output>
        ) : null}

        <div className="mt-4">
          {isLoading || (orderingDates && !isError) ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {["a", "b", "c"].map((k) => (
                <CardSkeleton key={k} />
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
          ) : results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                icon={SearchX}
                title={
                  estates.length === 0
                    ? "No offerings available yet"
                    : "No offering matches your criteria"
                }
                description={
                  estates.length === 0
                    ? "New tokenized assets will be listed here as soon as they are published."
                    : "Try widening the yield range or clearing some filters."
                }
                action={
                  filtersActive ? (
                    <Button variant="outline" size="sm" onClick={reset}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-5",
                layout === "grid"
                  ? "sm:grid-cols-2 xl:grid-cols-3"
                  : "grid-cols-1",
              )}
            >
              {results.map((estate, i) => (
                <RealEstateCard
                  key={estate.id}
                  estate={estate}
                  layout={layout}
                  priority={i < 3}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
