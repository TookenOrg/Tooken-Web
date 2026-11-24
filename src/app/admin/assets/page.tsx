"use client";

import { ArrowDown, ArrowUp, Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { RealEstateStatusBadge } from "@/components/app/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRealEstates } from "@/lib/api/hooks";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatRecordedMoney,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { AssetCell } from "./_components/asset-cell";
import {
  ASSET_FILTERS,
  type AssetFilter,
  type AssetSortKey,
  matchesAssetFilter,
  type SortDirection,
  sortAssets,
} from "./_components/asset-list";
import { useAssetDetails } from "./_components/use-asset-details";

export default function AssetsPage() {
  const router = useRouter();
  const list = useRealEstates();
  const rows = list.data ?? [];
  const details = useAssetDetails(rows.map((r) => r.id));
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{
    key: AssetSortKey;
    direction: SortDirection;
  }>({ key: "date", direction: "desc" });

  const changeSort = (key: AssetSortKey) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = rows
      .filter((r) => matchesAssetFilter(r.status, filter))
      .filter((r) => {
        if (!q) return true;
        const d = details.byId.get(r.id);
        return [
          r.title,
          r.location?.city,
          d?.issuer?.name,
          d?.token?.symbol,
          r.estate_type,
        ]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q));
      });
    return sortAssets(matches, sort.key, sort.direction);
  }, [rows, filter, query, details.byId, sort]);

  const counts = useMemo(() => {
    const c: Record<AssetFilter, number> = {
      all: 0,
      draft: 0,
      published: 0,
      fundraising: 0,
      funded: 0,
      other: 0,
    };
    for (const r of rows) {
      for (const f of ASSET_FILTERS)
        if (matchesAssetFilter(r.status, f.id)) c[f.id]++;
    }
    return c;
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Assets"
        description="Real estate offerings, from draft to tokenized fundraising."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Assets" },
        ]}
        actions={
          <Button
            asChild
            className="bg-brand text-brand-foreground hover:bg-brand-light"
          >
            <Link href="/admin/assets/new">
              <Plus /> New asset
            </Link>
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
          <fieldset
            aria-label="Filter by status"
            className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1"
          >
            {ASSET_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f.id
                    ? "bg-ink text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-ink",
                )}
              >
                {f.label}{" "}
                <span
                  className={cn(
                    "rounded px-1.5 text-[11px] tabular",
                    filter === f.id ? "bg-white/15" : "bg-muted",
                  )}
                >
                  {list.isSuccess ? counts[f.id] : "—"}
                </span>
              </button>
            ))}
          </fieldset>
          <div className="relative md:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search name, issuer, city, symbol…"
              aria-label="Search assets"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {list.isSuccess
              ? `${filtered.length} of ${rows.length} assets`
              : "Asset count unavailable"}
          </p>
          <label className="flex items-center gap-2 text-xs text-muted-foreground md:hidden">
            Sort
            <select
              aria-label="Sort assets"
              className="max-w-52 rounded-md border border-border bg-card px-2 py-2 text-ink"
              value={`${sort.key}:${sort.direction}`}
              onChange={(event) => {
                const [key, direction] = event.target.value.split(":") as [
                  AssetSortKey,
                  SortDirection,
                ];
                setSort({ key, direction });
              }}
            >
              <option value="date:desc">Newest first</option>
              <option value="date:asc">Oldest first</option>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
              <option value="status:asc">Status A–Z</option>
              <option value="status:desc">Status Z–A</option>
              <option value="valuation:asc">Valuation: low to high</option>
              <option value="valuation:desc">Valuation: high to low</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Valuations sort within currency, not across currencies.
          </p>
        </div>

        {details.isError ? (
          <Alert variant="destructive" className="m-4 w-auto">
            <AlertTitle>Some asset details are unavailable</AlertTitle>
            <AlertDescription>
              Issuer or token information and search results may be incomplete.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => details.refetchFailed()}
              >
                Retry
              </button>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        {list.isLoading ? (
          <TableSkeleton rows={4} cols={7} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={rows.length ? "No matching asset" : "No asset yet"}
            description={
              rows.length
                ? "Try another status or search term."
                : "Create a first asset to start the origination workflow."
            }
            action={
              rows.length ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                  }}
                >
                  Reset filters
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/admin/assets/new">
                    <Plus /> New asset
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortHead
                      label="Asset"
                      sortKey="name"
                      sort={sort}
                      onSort={changeSort}
                      className="pl-5"
                    />
                    <TableHead>Issuer</TableHead>
                    <SortHead
                      label="Status"
                      sortKey="status"
                      sort={sort}
                      onSort={changeSort}
                    />
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Price / share</TableHead>
                    <SortHead
                      label="Valuation"
                      sortKey="valuation"
                      sort={sort}
                      onSort={changeSort}
                      className="text-right"
                    />
                    <TableHead className="text-right">Yield</TableHead>
                    <TableHead>Token</TableHead>
                    <SortHead
                      label="Created"
                      sortKey="date"
                      sort={sort}
                      onSort={changeSort}
                      className="pr-5"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const d = details.byId.get(r.id);
                    const c = r.configuration;
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/admin/assets/${r.id}`)}
                      >
                        <TableCell className="pl-5">
                          <AssetCell asset={r} linked />
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">
                          {d?.issuer?.name ?? (
                            <span className="text-muted-foreground">
                              {details.failedIds.has(r.id)
                                ? "Unavailable"
                                : d
                                  ? "—"
                                  : "Loading…"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RealEstateStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatNumber(c?.total_shares)}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatRecordedMoney(
                            c?.price_per_share,
                            c?.currency_code,
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular">
                          {formatRecordedMoney(
                            c?.total_valuation,
                            c?.currency_code,
                            {
                              decimals: 0,
                            },
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatPercent(c?.yield)}
                        </TableCell>
                        <TableCell>
                          {d?.token?.symbol ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                              {d.token.symbol}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {details.failedIds.has(r.id)
                                ? "Unavailable"
                                : d
                                  ? "Not tokenized"
                                  : "Loading…"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="pr-5 text-sm text-muted-foreground">
                          {formatDate(r.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {filtered.map((r) => {
                const d = details.byId.get(r.id);
                const c = r.configuration;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/admin/assets/${r.id}`}
                      className="block space-y-3 px-4 py-4 hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <AssetCell asset={r} />
                        <RealEstateStatusBadge status={r.status} />
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Valuation</dt>
                          <dd className="font-medium text-ink tabular">
                            {formatRecordedMoney(
                              c?.total_valuation,
                              c?.currency_code,
                              {
                                compact: true,
                              },
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Price</dt>
                          <dd className="font-medium text-ink tabular">
                            {formatRecordedMoney(
                              c?.price_per_share,
                              c?.currency_code,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Yield</dt>
                          <dd className="font-medium text-ink tabular">
                            {formatPercent(c?.yield)}
                          </dd>
                        </div>
                      </dl>
                      <p className="truncate text-xs text-muted-foreground">
                        {d?.issuer?.name ??
                          (details.failedIds.has(r.id)
                            ? "Unavailable"
                            : d
                              ? "—"
                              : "Loading…")}
                        {d?.token?.symbol ? ` · ${d.token.symbol}` : ""}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}

function SortHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: AssetSortKey;
  sort: { key: AssetSortKey; direction: SortDirection };
  onSort: (key: AssetSortKey) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <TableHead
      className={className}
      aria-sort={
        active
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex min-h-8 items-center gap-1 rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        {active ? (
          sort.direction === "asc" ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )
        ) : null}
      </button>
    </TableHead>
  );
}
