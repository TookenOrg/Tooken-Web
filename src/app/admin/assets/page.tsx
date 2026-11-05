"use client";

import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { RealEstateStatusBadge } from "@/components/app/status-badges";
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
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AssetCell } from "./_components/asset-cell";
import { useAssetDetails } from "./_components/use-asset-details";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "published", label: "Published" },
  { id: "fundraising", label: "Fundraising" },
  { id: "other", label: "Funded & closed" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function matchesFilter(status: string | undefined, f: FilterId) {
  if (f === "all") return true;
  if (f === "other")
    return !["draft", "published", "fundraising"].includes(status ?? "");
  return status === f;
}

export default function AssetsPage() {
  const router = useRouter();
  const list = useRealEstates();
  const rows = list.data ?? [];
  const details = useAssetDetails(rows.map((r) => r.id));
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => matchesFilter(r.status, filter))
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
      })
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }, [rows, filter, query, details.byId]);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = {
      all: 0,
      draft: 0,
      published: 0,
      fundraising: 0,
      other: 0,
    };
    for (const r of rows) {
      for (const f of FILTERS) if (matchesFilter(r.status, f.id)) c[f.id]++;
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
          <div
            role="tablist"
            aria-label="Filter by status"
            className="-mx-1 flex gap-1 overflow-x-auto px-1"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f.id
                    ? "bg-ink text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-ink",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded px-1.5 text-[11px] tabular",
                    filter === f.id ? "bg-white/15" : "bg-muted",
                  )}
                >
                  {counts[f.id]}
                </span>
              </button>
            ))}
          </div>
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
              rows.length ? null : (
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
                    <TableHead className="pl-5">Asset</TableHead>
                    <TableHead>Issuer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Price / share</TableHead>
                    <TableHead className="text-right">Valuation</TableHead>
                    <TableHead className="text-right">Yield</TableHead>
                    <TableHead className="pr-5">Token</TableHead>
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
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RealEstateStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatNumber(c?.total_shares)}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatMoney(c?.price_per_share, c?.currency_code)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular">
                          {formatMoney(c?.total_valuation, c?.currency_code, {
                            decimals: 0,
                          })}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatPercent(c?.yield)}
                        </TableCell>
                        <TableCell className="pr-5">
                          {d?.token?.symbol ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                              {d.token.symbol}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not tokenized
                            </span>
                          )}
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
                            {formatMoney(c?.total_valuation, c?.currency_code, {
                              compact: true,
                            })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Price</dt>
                          <dd className="font-medium text-ink tabular">
                            {formatMoney(c?.price_per_share, c?.currency_code)}
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
                        {d?.issuer?.name ?? "—"}
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
