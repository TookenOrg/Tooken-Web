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
import { useOrders, useRealEstates } from "@/lib/api/hooks";
import { useSession } from "@/lib/auth/session-context";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { firstName, summarizePortfolio } from "@/lib/portfolio";
import { formatAmounts } from "../_components/amounts";
import { KycBanner } from "../_components/kyc-banner";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, isInvestor } = useSession();
  const orders = useOrders();
  const estates = useRealEstates();

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
  const openOfferings = (estates.data ?? []).filter(
    (e) => e.status === "fundraising",
  ).length;

  const invested = formatAmounts(summary.invested);
  const pending = formatAmounts(summary.pendingAmount);
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

      {user && isInvestor ? <KycBanner user={user} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Invested capital"
          icon={Wallet}
          accent="brand"
          loading={loading}
          value={invested.primary}
          hint={
            invested.others.length
              ? `+ ${invested.others.join(" · ")}`
              : "Settled orders, gross of fees"
          }
        />
        <StatCard
          label="Holdings"
          icon={Building2}
          loading={loading}
          value={formatNumber(summary.holdings.length)}
          hint={
            summary.holdings.length === 1 ? "Offering held" : "Offerings held"
          }
        />
        <StatCard
          label="Shares held"
          icon={Layers}
          accent="signal"
          loading={loading}
          value={formatNumber(summary.sharesHeld)}
          hint="Security tokens delivered on-chain"
        />
        <StatCard
          label="Pending orders"
          icon={Clock}
          accent={summary.pendingCount ? "brand" : "ink"}
          loading={loading}
          value={formatNumber(summary.pendingCount)}
          hint={
            summary.pendingCount
              ? `${pending.primary} awaiting settlement`
              : "No order in progress"
          }
        />
      </div>

      <Panel>
        <PanelHeader
          title="Holdings"
          description="Positions from settled orders, per offering."
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
                    <TableRow key={h.realEstateId}>
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
                        {formatMoney(h.averagePrice, h.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular">
                        {formatMoney(h.invested, h.currency)}
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
                <li key={h.realEstateId}>
                  <Link
                    href={`/real-estate/${h.realEstateId}`}
                    className="block px-5 py-4 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink">{h.title}</span>
                      <span className="font-semibold text-ink tabular">
                        {formatMoney(h.invested, h.currency)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular">
                      <span>{formatNumber(h.shares)} shares</span>
                      <span>
                        avg. {formatMoney(h.averagePrice, h.currency)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
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
                        {formatMoney(o.amountDue, o.currencyCode)}
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

        <Panel>
          <PanelHeader title="Quick access" />
          <ul className="divide-y divide-border">
            {[
              {
                href: "/explore",
                icon: Store,
                label: "Marketplace",
                hint: estates.isLoading
                  ? "Loading offerings…"
                  : `${openOfferings} offering${openOfferings === 1 ? "" : "s"} open for subscription`,
              },
              {
                href: "/orders",
                icon: ReceiptText,
                label: "My orders",
                hint: "Follow payment and token delivery",
              },
              {
                href: "/favorites",
                icon: Building2,
                label: "Watchlist",
                hint: "Offerings you follow",
              },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-muted/40"
                >
                  <span className="flex size-8 items-center justify-center rounded-md bg-ink/5 text-ink">
                    <item.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {item.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {item.hint}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
