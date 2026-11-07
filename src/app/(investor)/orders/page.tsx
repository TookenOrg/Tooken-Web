"use client";

import { ReceiptText, RefreshCw, Search, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { OrderStatusBadge } from "@/components/app/status-badges";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrders, useRealEstates } from "@/lib/api/hooks";
import type { IssuanceOrder } from "@/lib/api/types";
import {
  formatDateTime,
  formatNumber,
  formatRecordedMoney,
  formatRelative,
} from "@/lib/format";
import { reservationDeadlineState } from "@/lib/order-book";
import { type OrderCategory, orderCategory } from "@/lib/portfolio";
import { isOrderInFlight } from "@/lib/status";
import { cn } from "@/lib/utils";
import { useNow } from "../_components/use-now";

type Filter = "all" | OrderCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In progress" },
  { value: "settled", label: "Settled" },
  { value: "other", label: "Cancelled, refunds & exceptions" },
];

export default function OrdersPage() {
  const router = useRouter();
  const orders = useOrders();
  const estates = useRealEstates();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const titles = useMemo(
    () => new Map((estates.data ?? []).map((e) => [e.id, e.title] as const)),
    [estates.data],
  );
  const titleOf = (o: IssuanceOrder) =>
    titles.get(o.realEstateId) ??
    o.realEstateTitle ??
    `Offering #${o.realEstateId}`;

  const sorted = useMemo(
    () =>
      [...(orders.data ?? [])].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [orders.data],
  );
  const now = useNow(
    1000,
    sorted.some((o) => o.statusCode === "AWAITING_PAYMENT"),
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: sorted.length,
      in_progress: 0,
      settled: 0,
      other: 0,
    };
    for (const o of sorted) c[orderCategory(o.statusCode)] += 1;
    return c;
  }, [sorted]);

  const q = query.trim().toLowerCase();
  const rows = sorted.filter(
    (o) =>
      (filter === "all" || orderCategory(o.statusCode) === filter) &&
      (!q ||
        o.orderRef.toLowerCase().includes(q) ||
        titleOf(o).toLowerCase().includes(q)),
  );
  const live = sorted.some((o) => isOrderInFlight(o.statusCode));
  const href = (o: IssuanceOrder) =>
    `/orders/${encodeURIComponent(o.orderRef)}`;

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My orders" },
        ]}
        title="My orders"
        description="Subscription orders, from reservation to on-chain delivery of your security tokens."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => orders.refetch()}
              disabled={orders.isFetching}
            >
              <RefreshCw
                className={cn(
                  orders.isFetching &&
                    "animate-spin motion-reduce:animate-none",
                )}
              />
              Refresh
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand-light"
            >
              <Link href="/explore">
                <Store /> New subscription
              </Link>
            </Button>
          </>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-border px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value} className="gap-1.5">
                  {f.label}
                  <span className="rounded bg-muted px-1.5 text-[11px] text-muted-foreground tabular">
                    {counts[f.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-3">
            {live ? (
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
                Live updates
              </span>
            ) : null}
            <div className="relative w-full lg:w-64">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reference or offering"
                aria-label="Search orders by reference or offering"
                className="h-9 pl-8"
              />
            </div>
          </div>
        </div>

        {orders.isError ? (
          <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
        ) : orders.isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No orders yet"
            description="Your subscriptions will be listed here once placed."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/explore">Explore the marketplace</Link>
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching orders"
            description="Try another reference, offering or status filter."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Reference</TableHead>
                    <TableHead>Offering</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Amount due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-5 text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((o) => (
                    <TableRow
                      key={o.orderRef}
                      className="cursor-pointer"
                      onClick={() => router.push(href(o))}
                    >
                      <TableCell className="pl-5">
                        <Link
                          href={href(o)}
                          className="font-mono text-xs text-ink hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {o.orderRef}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-56 break-words font-medium text-ink">
                        {titleOf(o)}
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {formatNumber(o.tokenQuantity)}
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {formatRecordedMoney(o.unitPrice, o.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular">
                        {formatRecordedMoney(o.amountDue, o.currencyCode)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge code={o.statusCode} />
                        {o.statusCode === "AWAITING_PAYMENT" ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {reservationDeadlineState(
                              o.reservationExpiresAt,
                              now,
                            ) === "active" ? (
                              <>
                                Due {formatDateTime(o.reservationExpiresAt)}
                                <Link
                                  href={href(o)}
                                  className="mt-1 block font-medium text-ink underline"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  Payment details
                                </Link>
                              </>
                            ) : reservationDeadlineState(
                                o.reservationExpiresAt,
                                now,
                              ) === "lapsed" ? (
                              "Reservation ended"
                            ) : (
                              "Deadline unavailable"
                            )}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell
                        className="pr-5 text-right text-muted-foreground tabular"
                        title={formatDateTime(o.createdAt)}
                      >
                        {formatDateTime(o.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((o) => (
                <li key={o.orderRef}>
                  <Link
                    href={href(o)}
                    className="block space-y-2 px-5 py-4 hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-muted-foreground">
                          {o.orderRef}
                        </div>
                        <div className="break-words text-sm font-medium text-ink">
                          {titleOf(o)}
                        </div>
                      </div>
                      <OrderStatusBadge code={o.statusCode} />
                    </div>
                    <div className="flex items-end justify-between text-xs text-muted-foreground tabular">
                      <span>
                        {formatNumber(o.tokenQuantity)} ×{" "}
                        {formatRecordedMoney(o.unitPrice, o.currencyCode)}
                        <br />
                        {formatRelative(o.createdAt)}
                      </span>
                      <span className="text-sm font-semibold text-ink">
                        {formatRecordedMoney(o.amountDue, o.currencyCode)}
                      </span>
                    </div>
                    {o.statusCode === "AWAITING_PAYMENT" ? (
                      <div className="text-xs text-muted-foreground">
                        {reservationDeadlineState(
                          o.reservationExpiresAt,
                          now,
                        ) === "active"
                          ? `Payment details · due ${formatDateTime(o.reservationExpiresAt)}`
                          : reservationDeadlineState(
                                o.reservationExpiresAt,
                                now,
                              ) === "lapsed"
                            ? "Reservation ended"
                            : "Deadline unavailable"}
                      </div>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground tabular">
              {rows.length} of {sorted.length} order
              {sorted.length === 1 ? "" : "s"}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
