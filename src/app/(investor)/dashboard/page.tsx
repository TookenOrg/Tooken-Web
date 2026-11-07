"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Clock,
  Coins,
  Layers,
  ReceiptText,
  Store,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelHeader } from "@/components/app/panel";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { OrderStatusBadge } from "@/components/app/status-badges";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMyKycOnChain, useOrders, useRealEstates } from "@/lib/api/hooks";
import { useSession } from "@/lib/auth/session-context";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRecordedMoney,
} from "@/lib/format";
import { hasPaymentCurrency, reservationDeadlineState } from "@/lib/order-book";
import { firstName, summarizePortfolio } from "@/lib/portfolio";
import { canInvest } from "@/lib/status";
import { formatAmounts } from "../_components/amounts";
import { useNow } from "../_components/use-now";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, userLoading, isInvestor, refreshUser } = useSession();
  const orders = useOrders();
  const estates = useRealEstates();
  const registry = useMyKycOnChain();
  const now = useNow(
    1000,
    (orders.data ?? []).some((o) => o.statusCode === "AWAITING_PAYMENT"),
  );

  const titles = useMemo(
    () =>
      Object.fromEntries(
        (estates.data ?? []).map((e) => [e.id, e.title]),
      ) as Record<number, string | undefined>,
    [estates.data],
  );
  const summary = useMemo(
    () => summarizePortfolio(orders.data ?? [], titles),
    [orders.data, titles],
  );
  const recent = useMemo(
    () =>
      [...(orders.data ?? [])]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [orders.data],
  );
  const actions = (orders.data ?? [])
    .filter(
      (o) =>
        o.statusCode === "AWAITING_PAYMENT" ||
        o.statusCode === "DELIVERY_FAILED" ||
        o.statusCode === "REVERSAL_FAILED",
    )
    .sort((a, b) => {
      const aDeadline = Date.parse(a.reservationExpiresAt);
      const bDeadline = Date.parse(b.reservationExpiresAt);
      return (
        (Number.isFinite(aDeadline) ? aDeadline : Number.POSITIVE_INFINITY) -
        (Number.isFinite(bDeadline) ? bDeadline : Number.POSITIVE_INFINITY)
      );
    });

  const invested = formatAmounts(summary.invested);
  const pending = formatAmounts(summary.pendingAmount);
  const offeringCount = new Set(summary.holdings.map((h) => h.realEstateId))
    .size;
  const loading = orders.isLoading;
  const name = firstName(user?.full_name);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investor dashboard"
        title={name ? `${greeting()}, ${name}` : "Dashboard"}
        description="Your tokenized real-estate positions, orders and verification status at a glance."
        actions={
          <Button
            asChild
            className="bg-brand text-brand-foreground hover:bg-brand-light"
          >
            <Link href="/explore">
              <Store /> Browse offerings
            </Link>
          </Button>
        }
      />

      <Panel>
        <PanelHeader
          title="Next steps"
          description="Actions and updates requiring your attention."
        />
        <div className="space-y-3 px-5 pb-5">
          {isInvestor && userLoading ? (
            <p className="text-sm text-muted-foreground">
              Checking verification…
            </p>
          ) : isInvestor && !user ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>Account verification status is unavailable.</span>
              <Button variant="outline" size="sm" onClick={() => refreshUser()}>
                Retry
              </Button>
            </div>
          ) : isInvestor && user ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {!user.kyc_status
                  ? "Verification status is unavailable."
                  : !canInvest(user.kyc_status, user.kyc_expires_at)
                    ? user.kyc_status === "pending" ||
                      user.kyc_status === "approved"
                      ? "Verification is in progress."
                      : "Complete or renew your identity verification."
                    : registry.isLoading
                      ? "Checking verification status…"
                      : registry.isError || !registry.data
                        ? "Verification status is unavailable."
                        : registry.data.is_verified
                          ? `Identity verified${user.kyc_expires_at ? ` · valid until ${formatDate(user.kyc_expires_at)}` : ""}.`
                          : "Your registry status requires attention."}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/verification">View verification</Link>
              </Button>
            </div>
          ) : null}

          {orders.isError ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>Order actions are unavailable.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => orders.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : orders.isLoading ? (
            <p className="text-sm text-muted-foreground">Checking orders…</p>
          ) : actions.length ? (
            <ul className="divide-y divide-border border-t border-border">
              {actions.map((order) => {
                const deadline = reservationDeadlineState(
                  order.reservationExpiresAt,
                  now,
                );
                const awaiting = order.statusCode === "AWAITING_PAYMENT";
                return (
                  <li key={order.orderRef}>
                    <Link
                      href={`/orders/${encodeURIComponent(order.orderRef)}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>
                        <span className="block font-medium text-ink">
                          {awaiting && deadline === "active"
                            ? hasPaymentCurrency(order)
                              ? `Payment required · ${formatRecordedMoney(order.amountDue, order.currencyCode)}`
                              : "Payment currency unavailable"
                            : awaiting && deadline === "lapsed"
                              ? "Reservation ended"
                              : awaiting
                                ? "Reservation deadline unavailable"
                                : "Order requires attention"}
                        </span>
                        <span className="block break-words text-xs text-muted-foreground">
                          {order.realEstateTitle ??
                            titles[order.realEstateId] ??
                            order.orderRef}
                          {awaiting && deadline === "active"
                            ? ` · due ${formatDateTime(order.reservationExpiresAt)}`
                            : awaiting && deadline === "lapsed"
                              ? " · awaiting the order status update"
                              : ""}
                        </span>
                      </span>
                      <span className="text-xs font-medium text-ink">
                        View order →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No order action is currently required.
            </p>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Invested capital"
          icon={Wallet}
          accent="brand"
          loading={loading}
          value={
            orders.isError
              ? "Unavailable"
              : Object.keys(summary.invested).length
                ? invested.primary
                : "No holdings"
          }
          hint={
            orders.isError
              ? "Orders could not be loaded"
              : invested.others.length
                ? `+ ${invested.others.join(" · ")}`
                : "Settled orders, gross of fees"
          }
        />
        <StatCard
          label="Holdings"
          icon={Building2}
          loading={loading}
          value={orders.isError ? "Unavailable" : formatNumber(offeringCount)}
          hint={
            orders.isError
              ? "Orders could not be loaded"
              : offeringCount === 1
                ? "Offering held"
                : "Offerings held"
          }
        />
        <StatCard
          label="Shares held"
          icon={Layers}
          accent="signal"
          loading={loading}
          value={
            orders.isError ? "Unavailable" : formatNumber(summary.sharesHeld)
          }
          hint="Security tokens delivered on-chain"
        />
        <StatCard
          label="Pending orders"
          icon={Clock}
          accent={summary.pendingCount ? "brand" : "ink"}
          loading={loading}
          value={
            orders.isError ? "Unavailable" : formatNumber(summary.pendingCount)
          }
          hint={
            orders.isError
              ? "Orders could not be loaded"
              : summary.pendingCount
                ? `${[pending.primary, ...pending.others].join(" · ")} awaiting settlement`
                : "No order in progress"
          }
        />
      </div>

      <Panel>
        <PanelHeader
          title="Holdings"
          description="Positions from settled orders, by offering and currency."
        />
        {orders.isError ? (
          <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
        ) : loading ? (
          <TableSkeleton rows={2} cols={5} />
        ) : summary.holdings.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No holdings yet"
            description="Once an order is settled, the delivered shares appear here."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/explore">Explore the marketplace</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Offering</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Avg. price</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right">Last order</TableHead>
                    <TableHead className="w-10 pr-5">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.holdings.map((h) => (
                    <TableRow key={`${h.realEstateId}:${h.currency}`}>
                      <TableCell className="pl-5 font-medium text-ink">
                        <Link
                          href={`/real-estate/${h.realEstateId}`}
                          className="hover:underline"
                        >
                          {h.title}
                        </Link>
                        <div className="text-xs font-normal text-muted-foreground">
                          {h.orders} order{h.orders > 1 ? "s" : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {formatNumber(h.shares)}
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {h.averagePrice === null
                          ? h.currency
                          : formatMoney(h.averagePrice, h.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular">
                        {h.invested === null
                          ? h.currency
                          : formatMoney(h.invested, h.currency)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular">
                        {formatDate(h.lastOrderAt)}
                      </TableCell>
                      <TableCell className="pr-5">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Open ${h.title}`}
                        >
                          <Link href={`/real-estate/${h.realEstateId}`}>
                            <ArrowUpRight />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {summary.holdings.map((h) => (
                <li key={`${h.realEstateId}:${h.currency}`}>
                  <Link
                    href={`/real-estate/${h.realEstateId}`}
                    className="block px-5 py-4 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink">{h.title}</span>
                      <span className="font-semibold text-ink tabular">
                        {h.invested === null
                          ? h.currency
                          : formatMoney(h.invested, h.currency)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular">
                      <span>{formatNumber(h.shares)} shares</span>
                      <span>
                        avg.{" "}
                        {h.averagePrice === null
                          ? h.currency
                          : formatMoney(h.averagePrice, h.currency)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <div>
        <Panel>
          <PanelHeader
            title="Recent orders"
            description="Your latest subscriptions."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/orders">
                  View all <ArrowRight />
                </Link>
              </Button>
            }
          />
          {orders.isError ? (
            <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
          ) : loading ? (
            <TableSkeleton rows={3} cols={4} />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No orders yet"
              description="Subscribe to an open offering to place your first order."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((o) => (
                <li key={o.orderRef}>
                  <Link
                    href={`/orders/${encodeURIComponent(o.orderRef)}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs text-muted-foreground">
                        {o.orderRef}
                      </div>
                      <div className="truncate text-sm font-medium text-ink">
                        {titles[o.realEstateId] ??
                          o.realEstateTitle ??
                          `Offering #${o.realEstateId}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-ink tabular">
                        {formatRecordedMoney(o.amountDue, o.currencyCode)}
                      </div>
                      <div className="text-xs text-muted-foreground tabular">
                        {formatNumber(o.tokenQuantity)} shares ·{" "}
                        {formatDate(o.createdAt)}
                      </div>
                    </div>
                    <div className="w-full sm:w-40 sm:text-right">
                      <OrderStatusBadge code={o.statusCode} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
