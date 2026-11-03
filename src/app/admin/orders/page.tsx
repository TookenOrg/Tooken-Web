"use client";

import { Banknote, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
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
import { useOrders } from "@/lib/api/hooks";
import type { IssuanceOrder } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRelative,
} from "@/lib/format";
import {
  bucketCounts,
  filterOrders,
  isReservationLapsed,
  ORDER_BUCKETS,
  type OrderBucket,
  sortOrders,
  totalsByCurrency,
} from "@/lib/order-book";
import { cn } from "@/lib/utils";
import {
  investorLabel,
  useBackOfficeDirectory,
} from "../_components/use-directory";
import { ConfirmPaymentDialog } from "./_components/confirm-payment-dialog";

export default function AdminOrdersPage() {
  const { isAdmin } = useSession();
  const orders = useOrders();
  const { investors, assetTitles } = useBackOfficeDirectory();
  const [chosenBucket, setBucket] = useState<OrderBucket | null>(null);
  const [query, setQuery] = useState("");
  const [toConfirm, setToConfirm] = useState<IssuanceOrder | null>(null);

  const all = useMemo(() => orders.data ?? [], [orders.data]);
  const counts = useMemo(() => bucketCounts(all), [all]);
  // Open on the work queue when there is something to reconcile.
  const bucket: OrderBucket =
    chosenBucket ?? (counts.awaiting > 0 ? "awaiting" : "all");
  const rows = useMemo(
    () =>
      sortOrders(filterOrders(all, { bucket, query, investors, assetTitles })),
    [all, bucket, query, investors, assetTitles],
  );
  const totals = useMemo(() => totalsByCurrency(rows), [rows]);
  const activeBucket = ORDER_BUCKETS.find((b) => b.key === bucket);

  const titleOf = (o: IssuanceOrder) =>
    assetTitles.get(o.realEstateId) ??
    o.realEstateTitle ??
    `Asset #${o.realEstateId}`;

  const onConfirmClick = isAdmin ? setToConfirm : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Distribution"
        title="Order book"
        description="Primary subscriptions across every offering. Reconcile incoming transfers and follow on-chain settlement."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Orders" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => orders.refetch()}
            disabled={orders.isFetching}
          >
            <RefreshCw className={cn(orders.isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between md:px-5">
          <Tabs
            value={bucket}
            onValueChange={(v) => setBucket(v as OrderBucket)}
            className="-mx-1 overflow-x-auto px-1"
          >
            <TabsList aria-label="Order status">
              {ORDER_BUCKETS.map((b) => (
                <TabsTrigger key={b.key} value={b.key} className="gap-1.5">
                  {b.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] tabular",
                      b.key === "awaiting" && counts.awaiting > 0
                        ? "bg-amber-100 text-amber-800"
                        : b.key === "exceptions" && counts.exceptions > 0
                          ? "bg-red-50 text-red-700"
                          : "bg-background/70 text-muted-foreground",
                    )}
                  >
                    {counts[b.key]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full lg:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Reference, investor, asset…"
              aria-label="Search orders"
              className="pl-8"
            />
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border bg-muted/40 px-4 py-2.5 text-xs md:px-5"
          aria-live="polite"
        >
          <span className="text-muted-foreground">
            {activeBucket?.description}
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <span className="text-muted-foreground">Orders </span>
              <span className="font-semibold text-ink tabular">
                {formatNumber(rows.length)}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">Amount due </span>
              <span className="font-semibold text-ink tabular">
                {totals.length
                  ? totals
                      .map((t) => formatMoney(t.amount, t.currency))
                      .join(" + ")
                  : formatMoney(0)}
              </span>
            </span>
          </span>
        </div>

        {orders.isPending ? (
          <TableSkeleton rows={5} cols={7} />
        ) : orders.isError ? (
          <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title={query ? "No matching orders" : "No orders here"}
            description={
              query
                ? "Try another reference, investor or asset name."
                : "Orders will appear as soon as investors subscribe."
            }
          />
        ) : (
          <>
            {/* Cards on small screens */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map((o) => (
                <li key={o.orderRef} className="space-y-2 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/orders/${encodeURIComponent(o.orderRef)}`}
                      className="font-mono text-xs font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {o.orderRef}
                    </Link>
                    <OrderStatusBadge code={o.statusCode} />
                  </div>
                  <div className="text-sm text-ink">{titleOf(o)}</div>
                  <div className="text-xs text-muted-foreground">
                    {investorLabel(o.userId, investors.get(o.userId))}
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="text-xs text-muted-foreground tabular">
                      {formatNumber(o.tokenQuantity)} ×{" "}
                      {formatMoney(o.unitPrice, o.currencyCode)}
                      <div>{formatDateTime(o.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-ink tabular">
                        {formatMoney(o.amountDue, o.currencyCode)}
                      </div>
                      <ReservationHint order={o} />
                    </div>
                  </div>
                  {o.statusCode === "AWAITING_PAYMENT" ? (
                    <ConfirmButton
                      className="w-full"
                      onClick={onConfirmClick && (() => onConfirmClick(o))}
                    />
                  ) : null}
                </li>
              ))}
            </ul>

            {/* Table from md upwards */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Reference</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Offering</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Amount due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Reservation</TableHead>
                    <TableHead className="pr-5 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((o) => {
                    const investor = investors.get(o.userId);
                    return (
                      <TableRow key={o.orderRef}>
                        <TableCell className="pl-5">
                          <Link
                            href={`/admin/orders/${encodeURIComponent(o.orderRef)}`}
                            className="font-mono text-xs font-medium text-ink underline-offset-4 hover:underline"
                          >
                            {o.orderRef}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-48">
                          <div className="truncate text-sm text-ink">
                            {investor?.fullName ?? `User #${o.userId}`}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {investor?.email ?? `ID ${o.userId}`}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-56">
                          <div className="truncate">{titleOf(o)}</div>
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatNumber(o.tokenQuantity)}
                        </TableCell>
                        <TableCell className="text-right tabular text-muted-foreground">
                          {formatMoney(o.unitPrice, o.currencyCode)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-ink tabular">
                          {formatMoney(o.amountDue, o.currencyCode)}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge code={o.statusCode} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular">
                          {formatDateTime(o.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular">
                          <ReservationHint order={o} withDate />
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          {o.statusCode === "AWAITING_PAYMENT" ? (
                            <ConfirmButton
                              onClick={
                                onConfirmClick && (() => onConfirmClick(o))
                              }
                            />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Panel>

      <ConfirmPaymentDialog
        order={toConfirm}
        investorLabel={
          toConfirm
            ? investorLabel(toConfirm.userId, investors.get(toConfirm.userId))
            : undefined
        }
        open={!!toConfirm}
        onOpenChange={(open) => !open && setToConfirm(null)}
      />
    </>
  );
}

function ConfirmButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button
      size="sm"
      className={cn(
        "bg-brand text-brand-foreground hover:bg-brand-light",
        className,
      )}
      onClick={onClick}
      disabled={!onClick}
      title={onClick ? undefined : "Requires administrator rights"}
    >
      <Banknote /> Confirm payment
    </Button>
  );
}

function ReservationHint({
  order,
  withDate,
}: {
  order: IssuanceOrder;
  withDate?: boolean;
}) {
  if (order.statusCode !== "AWAITING_PAYMENT" && order.statusCode !== "CREATED")
    return withDate ? <span className="text-muted-foreground">—</span> : null;
  const lapsed = isReservationLapsed(order);
  return (
    <div className={cn("text-xs", lapsed ? "text-red-600" : "text-amber-700")}>
      {withDate ? (
        <div className="text-ink/80">
          {formatDateTime(order.reservationExpiresAt)}
        </div>
      ) : null}
      {lapsed
        ? "Reservation lapsed"
        : `Expires ${formatRelative(order.reservationExpiresAt)}`}
    </div>
  );
}
