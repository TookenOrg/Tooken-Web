"use client";

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
import { useRealEstates } from "@/lib/api/hooks";
import type { RealEstateSummary } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { countryName, ESTATE_TYPES } from "@/lib/reference";
import { REAL_ESTATE_STATUS, realEstateStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

type SortKey = "yield-desc" | "price-asc" | "price-desc" | "newest";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "yield-desc", label: "Highest yield" },
  { value: "price-asc", label: "Price per share: low to high" },
  { value: "price-desc", label: "Price per share: high to low" },
  { value: "newest", label: "Newest first" },
];

const YIELD_MAX = 15;
const ALL = "all";

function num(v: string | number | undefined | null): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

function sortEstates(list: RealEstateSummary[], sort: SortKey) {
  const copy = [...list];
  switch (sort) {
    case "yield-desc":
      return copy.sort(
        (a, b) => num(b.configuration?.yield) - num(a.configuration?.yield),
      );
    case "price-asc":
      return copy.sort(
        (a, b) =>
          num(a.configuration?.price_per_share) -
          num(b.configuration?.price_per_share),
      );
    case "price-desc":
      return copy.sort(
        (a, b) =>
          num(b.configuration?.price_per_share) -
          num(a.configuration?.price_per_share),
      );
    case "newest":
      return copy.sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      );
  }
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
  const [sort, setSort] = useState<SortKey>("yield-desc");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const estates = data ?? [];

  const statuses = useMemo(
    () => Array.from(new Set(estates.map((e) => e.status).filter(Boolean))),
    [estates],
  ) as string[];

  const yieldActive = yieldRange[0] > 0 || yieldRange[1] < YIELD_MAX;
  const filtersActive =
    !!query || type !== ALL || status !== ALL || yieldActive;

  const results = useMemo(() => {
    const filtered = estates.filter((e) => {
      if (!matchesQuery(e, query.trim())) return false;
      if (type !== ALL && String(e.estate_type_id) !== type) return false;
      if (status !== ALL && e.status !== status) return false;
      if (yieldActive) {
        const y = e.configuration?.yield;
        if (typeof y !== "number") return false;
        if (y < yieldRange[0]) return false;
        if (yieldRange[1] < YIELD_MAX && y > yieldRange[1]) return false;
      }
      return true;
    });
    return sortEstates(filtered, sort);
  }, [estates, query, type, status, yieldActive, yieldRange, sort]);

  const reset = () => {
    setQuery("");
    setType(ALL);
    setStatus(ALL);
    setYieldRange([0, YIELD_MAX]);
  };

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            The asset collection
          </p>
          <h1 className="mt-4 font-editorial text-5xl font-normal tracking-tight text-ink sm:text-6xl">
            Find your perspective.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Explore the offerings, compare the terms and read the documents.
            Subscriptions are available to verified investors. Capital at risk.
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
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Asset type">
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
              <SelectTrigger className="w-full sm:w-48" aria-label="Status">
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
                    "justify-start font-normal",
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

            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Sort by">
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
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isLoading ? (
              "Loading offerings…"
            ) : (
              <>
                <span className="font-semibold text-ink tabular">
                  {results.length}
                </span>{" "}
                {results.length === 1 ? "offering" : "offerings"}
                {filtersActive ? ` of ${estates.length}` : ""}
              </>
            )}
            {filtersActive ? (
              <Button
                variant="link"
                size="sm"
                onClick={reset}
                className="ml-2 h-auto p-0 text-ink"
              >
                <X className="size-3.5" /> Clear filters
              </Button>
            ) : null}
          </p>
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

        <div className="mt-4">
          {isLoading ? (
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
