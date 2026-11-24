"use client";

import { Banknote, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useNow } from "@/app/(investor)/_components/use-now";
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
  formatRecordedMoney,
  formatRelative,
} from "@/lib/format";
import {
  bucketCounts,
  filterOrders,
  hasPaymentCurrency,
  ORDER_BUCKETS,
  type OrderBucket,
  reservationDeadlineState,
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
  const now = useNow(
    1000,
    all.some((o) => o.statusCode === "AWAITING_PAYMENT"),
  );
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

  const confirmationOrder = toConfirm
    ? (all.find((order) => order.orderRef === toConfirm.orderRef) ?? null)
    : null;

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
            <RefreshCw
              className={cn(
                orders.isFetching && "animate-spin motion-reduce:animate-none",
              )}
            />
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
                    {orders.isError && !orders.data ? "—" : counts[b.key]}
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
                {orders.isError
                  ? "—"
                  : orders.isPending
                    ? "Loading"
                    : formatNumber(rows.length)}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">Amount due </span>
              <span className="font-semibold text-ink tabular">
                {orders.isError
                  ? "Unavailable"
                  : orders.isPending
                    ? "Loading"
                    : totals.length
                      ? totals
                          .map((t) =>
                            t.amount === null
                              ? t.currency
                              : formatMoney(t.amount, t.currency),
                          )
                          .join(" · ")
                      : rows.length
                        ? "Unavailable"
                        : "No orders"}
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
            action={
              query ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Cards on small screens */}
            <ul className="divide-y divide-border xl:hidden">
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
                      {formatRecordedMoney(o.unitPrice, o.currencyCode)}
                      <div>{formatDateTime(o.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-ink tabular">
                        {formatRecordedMoney(o.amountDue, o.currencyCode)}
                      </div>
                      <ReservationHint order={o} now={now} />
                    </div>
                  </div>
                  {o.statusCode === "AWAITING_PAYMENT" ? (
                    <ConfirmButton
                      order={o}
                      isAdmin={isAdmin}
                      now={now}
                      className="w-full"
                      onConfirm={() => setToConfirm(o)}
                    />
                  ) : null}
                </li>
              ))}
            </ul>

            {/* Table on wide screens */}
            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Reference / offering</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Amount due</TableHead>
                    <TableHead>Status</TableHead>
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
                          <div className="max-w-56 break-words text-sm text-ink">
                            {titleOf(o)}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-48">
                          <div className="truncate text-sm text-ink">
                            {investor?.fullName ?? `User #${o.userId}`}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {investor?.email ?? `ID ${o.userId}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-ink tabular">
                          {formatRecordedMoney(o.amountDue, o.currencyCode)}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge code={o.statusCode} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular">
                          <ReservationHint order={o} now={now} withDate />
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          {o.statusCode === "AWAITING_PAYMENT" ? (
                            <ConfirmButton
                              order={o}
                              isAdmin={isAdmin}
                              now={now}
                              onConfirm={() => setToConfirm(o)}
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
        order={confirmationOrder}
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
  order,
  isAdmin,
  now,
  onConfirm,
  className,
}: {
  order: IssuanceOrder;
  isAdmin: boolean;
  now: number;
  onConfirm: () => void;
  className?: string;
}) {
  const deadline = reservationDeadlineState(order.reservationExpiresAt, now);
  if (!isAdmin || deadline !== "active" || !hasPaymentCurrency(order)) {
    return (
      <div className={cn("space-y-1", className)}>
        <Button asChild size="sm" variant="outline" className={className}>
          <Link href={`/admin/orders/${encodeURIComponent(order.orderRef)}`}>
            View order
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          {!isAdmin
            ? "Only administrators can confirm payments."
            : deadline === "lapsed"
              ? "Reservation ended; awaiting the server status."
              : deadline === "unknown"
                ? "Reservation deadline unavailable."
                : "Payment currency unavailable; refresh the order."}
        </p>
      </div>
    );
  }
  return (
    <Button
      size="sm"
      className={cn(
        "bg-brand text-brand-foreground hover:bg-brand-light",
        className,
      )}
      onClick={onConfirm}
    >
      <Banknote /> Confirm payment
    </Button>
  );
}

function ReservationHint({
  order,
  now,
  withDate,
}: {
  order: IssuanceOrder;
  now: number;
  withDate?: boolean;
}) {
  if (order.statusCode !== "AWAITING_PAYMENT" && order.statusCode !== "CREATED")
    return withDate ? <span className="text-muted-foreground">—</span> : null;
  const deadline = reservationDeadlineState(order.reservationExpiresAt, now);
  return (
    <div
      className={cn(
        "text-xs",
        deadline === "lapsed" ? "text-red-600" : "text-amber-700",
      )}
    >
      {withDate ? (
        <div className="text-ink/80">
          {formatDateTime(order.reservationExpiresAt)}
        </div>
      ) : null}
      {deadline === "lapsed"
        ? "Reservation lapsed"
        : deadline === "unknown"
          ? "Reservation deadline unavailable"
          : `Expires ${formatRelative(order.reservationExpiresAt)}`}
    </div>
  );
}
