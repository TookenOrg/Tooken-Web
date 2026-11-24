"use client";

import { useQueries } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  Landmark,
  RefreshCw,
  Rocket,
  Unlock,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useNow } from "@/app/(investor)/_components/use-now";
import { HealthIndicator } from "@/components/app/health-indicator";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import {
  OrderStatusBadge,
  RealEstateStatusBadge,
} from "@/components/app/status-badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { kycApi } from "@/lib/api/endpoints";
import {
  queryKeys,
  useHealth,
  useIssuers,
  useKycList,
  useOrders,
  useRealEstates,
} from "@/lib/api/hooks";
import { useSession } from "@/lib/auth/session-context";
import {
  addDecimal,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRecordedMoney,
  formatRelative,
} from "@/lib/format";
import { needsOnChainSync } from "@/lib/kyc-review";
import { hasPaymentCurrency, reservationDeadlineState } from "@/lib/order-book";
import { countryName } from "@/lib/reference";
import { isOrderSettled } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Exact sums grouped by currency; malformed amounts are skipped. */
function sumByCurrency(
  items: { amount: string | undefined; currency: string | undefined }[],
): Map<string, string | null> {
  const totals = new Map<string, string | null>();
  for (const { amount, currency } of items) {
    if (!amount) continue;
    const ccy = currency?.trim();
    if (!ccy || !/^[A-Z]{3}$/.test(ccy)) {
      totals.set("Currency unavailable", null);
      continue;
    }
    try {
      totals.set(ccy, addDecimal(totals.get(ccy) ?? "0", amount, 2));
    } catch {
      // Ignore values the API did not send as plain decimals.
    }
  }
  return totals;
}

function MoneyTotals({
  totals,
  compact,
}: {
  totals: Map<string, string | null>;
  compact?: boolean;
}) {
  const entries = [...totals.entries()];
  if (!entries.length) return "—";
  return (
    <>
      {entries
        .map(([ccy, v]) =>
          v === null ? ccy : formatMoney(v, ccy, { decimals: 0, compact }),
        )
        .join(" · ")}
    </>
  );
}

function recordedValuation(
  amount: string | null | undefined,
  currency: string | null | undefined,
) {
  if (!amount) return "—";
  return currency
    ? formatMoney(amount, currency, { decimals: 0 })
    : "Currency unavailable";
}

type Action = {
  key: string;
  href: string;
  icon: typeof Wallet;
  tone: string;
  title: string;
  detail: string;
  sortAt: number;
};

export default function AdminOverviewPage() {
  const { user, isAdmin } = useSession();
  const estates = useRealEstates();
  const issuers = useIssuers();
  const orders = useOrders();
  const kyc = useKycList({}, isAdmin);
  // The list does not include on-chain status, so read approved file details.
  const approvedKyc = isAdmin
    ? (kyc.data ?? []).filter((k) => k.status === "approved")
    : [];
  const syncDetails = useQueries({
    queries: approvedKyc.map((k) => ({
      queryKey: queryKeys.kyc(k.id),
      queryFn: () => kycApi.get(k.id),
    })),
  });

  const assets = (estates.data ?? []).filter((r) => r.status !== "cancelled");
  const allOrders = [...(orders.data ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const byStatus = (s: string) => assets.filter((r) => r.status === s);
  const drafts = byStatus("draft");
  const published = byStatus("published");
  const fundraising = byStatus("fundraising");

  const valuation = sumByCurrency(
    assets.map((r) => ({
      amount: r.configuration?.total_valuation,
      currency: r.configuration?.currency_code,
    })),
  );
  const awaiting = allOrders.filter((o) => o.statusCode === "AWAITING_PAYMENT");
  const now = useNow(1000, awaiting.length > 0);
  const awaitingTotal = sumByCurrency(
    awaiting.map((o) => ({ amount: o.amountDue, currency: o.currencyCode })),
  );
  const settled = allOrders.filter((o) => isOrderSettled(o.statusCode));
  const settledVolume = sumByCurrency(
    settled.map((o) => ({ amount: o.grossAmount, currency: o.currencyCode })),
  );
  const activeIssuers = (issuers.data ?? []).filter(
    (i) => i.status === "active",
  ).length;
  const pendingKyc = (kyc.data ?? []).filter((k) => k.status === "submitted");
  const syncKyc = syncDetails.flatMap((q) =>
    q.data && needsOnChainSync(q.data) === true ? [q.data] : [],
  );
  const kycError =
    (isAdmin && kyc.isError ? kyc.error : null) ??
    syncDetails.find((q) => q.isError)?.error;
  const syncUnknown = syncDetails.some(
    (q) => q.isSuccess && (!q.data || needsOnChainSync(q.data) === undefined),
  );
  const actionError =
    (estates.isError ? estates.error : null) ??
    (orders.isError ? orders.error : null) ??
    kycError ??
    (syncUnknown
      ? new Error("Some registration statuses are unavailable.")
      : null);
  const actionLoading =
    estates.isLoading ||
    orders.isLoading ||
    (isAdmin && kyc.isLoading) ||
    syncDetails.some((q) => q.isLoading);
  const timestamp = (value: string | null | undefined) => {
    const t = value ? Date.parse(value) : Number.NaN;
    return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
  };

  const actions: Action[] = [
    ...awaiting.map((o) => {
      const deadline = reservationDeadlineState(o.reservationExpiresAt, now);
      return {
        key: `order-${o.orderRef}`,
        href: `/admin/orders/${encodeURIComponent(o.orderRef)}`,
        icon: Wallet,
        tone: "bg-amber-50 text-amber-700",
        title:
          deadline === "lapsed"
            ? `Review lapsed reservation · ${o.orderRef}`
            : deadline === "unknown"
              ? `Review reservation · ${o.orderRef}`
              : `${isAdmin && hasPaymentCurrency(o) ? "Confirm payment" : "View order"} · ${o.orderRef}`,
        detail: `${formatRecordedMoney(o.amountDue, o.currencyCode)} · ${o.realEstateTitle ?? `Asset #${o.realEstateId}`} · ${
          deadline === "unknown"
            ? "deadline unavailable"
            : deadline === "lapsed"
              ? "awaiting server status"
              : `reservation ends ${formatRelative(o.reservationExpiresAt)}`
        }`,
        sortAt: timestamp(o.reservationExpiresAt),
      };
    }),
    ...allOrders
      .filter(
        (o) =>
          o.statusCode === "DELIVERY_FAILED" ||
          o.statusCode === "REVERSAL_FAILED",
      )
      .map((o) => ({
        key: `incident-${o.orderRef}`,
        href: `/admin/orders/${encodeURIComponent(o.orderRef)}`,
        icon: Wallet,
        tone: "bg-red-50 text-red-700",
        title: `Investigate order · ${o.orderRef}`,
        detail: `${o.realEstateTitle ?? `Asset #${o.realEstateId}`} · ${o.statusCode === "DELIVERY_FAILED" ? "Delivery failed" : "Reversal failed"}`,
        sortAt: timestamp(o.updatedAt),
      })),
    ...(isAdmin
      ? pendingKyc.map((k) => ({
          key: `kyc-${k.id}`,
          href: `/admin/compliance/${k.id}`,
          icon: FileCheck2,
          tone: "bg-cyan-50 text-cyan-700",
          title: `Review KYC · ${k.declared_full_name ?? k.email ?? `File #${k.id}`}`,
          detail: `${countryName(k.declared_country_code)} · submitted ${formatRelative(k.submitted_at)}`,
          sortAt: timestamp(k.submitted_at ?? k.created_at),
        }))
      : []),
    ...syncKyc.map((k) => ({
      key: `sync-kyc-${k.id}`,
      href: `/admin/compliance/${k.id}`,
      icon: RefreshCw,
      tone: "bg-cyan-50 text-cyan-700",
      title: `Sync KYC · ${k.declared_full_name ?? k.email ?? `File #${k.id}`}`,
      detail: "Approved. Register the investor on-chain to enable investing.",
      sortAt: timestamp(k.decided_at ?? k.created_at),
    })),
    ...drafts.map((r) => ({
      key: `draft-${r.id}`,
      href: `/admin/assets/${r.id}`,
      icon: Rocket,
      tone: "bg-slate-100 text-slate-700",
      title: `Publish draft · ${r.title ?? `#${r.id}`}`,
      detail: "Complete, then tokenize to make it investable.",
      sortAt: Number.POSITIVE_INFINITY,
    })),
    ...published.map((r) => ({
      key: `open-${r.id}`,
      href: `/admin/assets/${r.id}`,
      icon: Unlock,
      tone: "bg-emerald-50 text-emerald-700",
      title: `Open fundraising · ${r.title ?? `#${r.id}`}`,
      detail: "Token deployed. Subscriptions are not open yet.",
      sortAt: Number.POSITIVE_INFINITY,
    })),
  ].sort((a, b) => a.sortAt - b.sortAt || a.key.localeCompare(b.key));

  const firstName = user?.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow="Back office"
        title={firstName ? `Good day, ${firstName}` : "Operations overview"}
        description="Origination pipeline, distribution and compliance at a glance."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/issuers/new">
                <Landmark /> New issuer
              </Link>
            </Button>
            <Button
              asChild
              className="bg-brand text-brand-foreground hover:bg-brand-light"
            >
              <Link href="/admin/assets/new">
                <Building2 /> New asset
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <ActionQueue
          actions={actions}
          loading={actionLoading}
          error={actionError}
          isAdmin={isAdmin}
          onRetry={() => {
            if (estates.isError) estates.refetch();
            if (orders.isError) orders.refetch();
            if (isAdmin && kyc.isError) kyc.refetch();
            for (const q of syncDetails) q.refetch();
          }}
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <StatCard
            label="Offerings"
            icon={Building2}
            loading={estates.isLoading}
            value={
              estates.isError ? "Unavailable" : formatNumber(assets.length)
            }
            hint={
              estates.isError
                ? "Offerings could not be loaded"
                : `${drafts.length} draft · ${published.length} published · ${fundraising.length} fundraising`
            }
          />
          <StatCard
            label="Recorded offering valuations"
            icon={Landmark}
            accent="brand"
            loading={estates.isLoading}
            value={
              estates.isError ? (
                "Unavailable"
              ) : (
                <MoneyTotals totals={valuation} />
              )
            }
            hint="Recorded amounts, not a current market valuation"
          />
          <StatCard
            label="Issuers"
            icon={BadgeCheck}
            loading={issuers.isLoading}
            value={
              issuers.isError
                ? "Unavailable"
                : formatNumber(issuers.data?.length ?? 0)
            }
            hint={
              issuers.isError
                ? "Issuers could not be loaded"
                : `${activeIssuers} active`
            }
          />
          <StatCard
            label="Awaiting payment"
            icon={Clock}
            accent="brand"
            loading={orders.isLoading}
            value={
              orders.isError ? "Unavailable" : formatNumber(awaiting.length)
            }
            hint={
              orders.isError ? (
                "Orders could not be loaded"
              ) : awaiting.length ? (
                <>
                  <MoneyTotals totals={awaitingTotal} /> due
                </>
              ) : (
                "No pending reservation"
              )
            }
          />
          <StatCard
            label="Settled orders"
            icon={CheckCircle2}
            accent="success"
            loading={orders.isLoading}
            value={
              orders.isError ? "Unavailable" : formatNumber(settled.length)
            }
            hint={
              orders.isError ? (
                "Orders could not be loaded"
              ) : (
                <>
                  <MoneyTotals totals={settledVolume} /> subscribed
                </>
              )
            }
          />
          {isAdmin ? (
            <StatCard
              label="KYC pending review"
              icon={FileCheck2}
              accent="signal"
              loading={kyc.isLoading}
              value={
                kyc.isError ? "Unavailable" : formatNumber(pendingKyc.length)
              }
              hint={
                <Link href="/admin/compliance" className="hover:underline">
                  Open compliance queue
                </Link>
              }
            />
          ) : (
            <StatCard
              label="Fundraising"
              icon={Unlock}
              accent="signal"
              loading={estates.isLoading}
              value={
                estates.isError
                  ? "Unavailable"
                  : formatNumber(fundraising.length)
              }
              hint={
                estates.isError
                  ? "Offerings could not be loaded"
                  : "Offerings open for subscription"
              }
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <RecentOrders
              loading={orders.isLoading}
              error={orders.isError ? orders.error : null}
              onRetry={() => orders.refetch()}
              rows={allOrders.slice(0, 6)}
            />
            <Offerings
              loading={estates.isLoading}
              error={estates.isError ? estates.error : null}
              onRetry={() => estates.refetch()}
              rows={assets}
            />
          </div>
          <div className="min-w-0 space-y-6">
            <PlatformHealth isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </>
  );
}

function ActionQueue({
  actions,
  loading,
  error,
  isAdmin,
  onRetry,
}: {
  actions: Action[];
  loading: boolean;
  error: unknown;
  isAdmin: boolean;
  onRetry: () => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Action required"
        description="Items waiting on an operator."
        actions={
          !loading && !error && actions.length ? (
            <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-white tabular">
              {actions.length}
            </span>
          ) : null
        }
      />
      {loading ? (
        <TableSkeleton rows={3} cols={1} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : actions.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All clear"
          description="Nothing is waiting on you right now."
        />
      ) : (
        <ul className="divide-y divide-border">
          {actions.slice(0, 8).map((a) => (
            <li key={a.key}>
              <Link
                href={a.href}
                className="group flex items-center gap-3 px-5 py-3 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md",
                    a.tone,
                  )}
                >
                  <a.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-medium text-ink">
                    {a.title}
                  </span>
                  <span className="block break-words text-xs text-muted-foreground">
                    {a.detail}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
          {actions.length > 8 ? (
            <li className="flex flex-wrap gap-3 px-5 py-3 text-xs">
              <Link href="/admin/orders" className="underline">
                View order book
              </Link>
              {isAdmin ? (
                <Link href="/admin/compliance" className="underline">
                  View KYC queue
                </Link>
              ) : null}
              <Link href="/admin/assets" className="underline">
                View assets
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </Panel>
  );
}

function RecentOrders({
  loading,
  error,
  onRetry,
  rows,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  rows: ReturnType<typeof useOrders>["data"] & object;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Recent orders"
        description="Latest subscriptions across all offerings."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/orders">
              View all <ArrowRight />
            </Link>
          </Button>
        }
      />
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No order yet"
          description="Orders appear once investors subscribe to an open offering."
        />
      ) : (
        <>
          <ul className="divide-y divide-border md:hidden">
            {rows.map((o) => (
              <li key={o.orderRef}>
                <Link
                  href={`/admin/orders/${encodeURIComponent(o.orderRef)}`}
                  className="block space-y-1 px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block break-words font-medium text-ink">
                    {o.realEstateTitle ?? `#${o.realEstateId}`}
                  </span>
                  <span className="block break-all font-mono text-xs text-muted-foreground">
                    {o.orderRef}
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <OrderStatusBadge code={o.statusCode} />
                    <span>
                      {formatRecordedMoney(o.amountDue, o.currencyCode)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Reference</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Amount due</TableHead>
                  <TableHead className="pr-5">Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.orderRef}>
                    <TableCell className="pl-5">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(o.orderRef)}`}
                        className="whitespace-nowrap font-mono text-xs font-medium text-ink hover:underline"
                      >
                        {o.orderRef}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {o.realEstateTitle ?? `#${o.realEstateId}`}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge code={o.statusCode} />
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {formatNumber(o.tokenQuantity)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular">
                      {formatRecordedMoney(o.amountDue, o.currencyCode)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap pr-5 text-sm text-muted-foreground">
                      {formatDateTime(o.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </Panel>
  );
}

function Offerings({
  loading,
  error,
  onRetry,
  rows,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  rows: ReturnType<typeof useRealEstates>["data"] & object;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Offerings"
        description="Pipeline and subscription progress."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/assets">
              View all <ArrowRight />
            </Link>
          </Button>
        }
      />
      {loading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No offering yet"
          action={
            <Button variant="outline" asChild>
              <Link href="/admin/assets/new">Create an asset</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/assets/${r.id}`}
                  className="block space-y-1 px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block break-words font-medium text-ink">
                    {r.title ?? `#${r.id}`}
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <RealEstateStatusBadge status={r.status} />
                    <span>
                      {recordedValuation(
                        r.configuration?.total_valuation,
                        r.configuration?.currency_code,
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Asset</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[160px]">Subscribed</TableHead>
                  <TableHead className="pr-5 text-right">Valuation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const c = r.configuration;
                  const sold = r.progression?.tokens_sold;
                  const pctValue = r.progression?.tokens_sold_pctg;
                  const pct = pctValue == null ? null : Number(pctValue);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="pl-5">
                        <Link
                          href={`/admin/assets/${r.id}`}
                          className="font-medium text-ink hover:underline"
                        >
                          {r.title ?? `#${r.id}`}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {r.location?.city ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <RealEstateStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {pct !== null && Number.isFinite(pct) ? (
                            <Progress
                              value={Math.min(100, pct)}
                              aria-label={`${pct} % subscribed`}
                              className="h-1.5 bg-muted [&>div]:bg-emerald-600"
                            />
                          ) : null}
                          <p className="text-xs text-muted-foreground tabular">
                            {formatNumber(sold)} /{" "}
                            {formatNumber(c?.total_shares)} ·{" "}
                            {pct !== null && Number.isFinite(pct)
                              ? `${formatNumber(pct, 2)} %`
                              : "unavailable"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap pr-5 text-right font-medium tabular">
                        {recordedValuation(
                          c?.total_valuation,
                          c?.currency_code,
                        )}
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
  );
}

function PlatformHealth({ isAdmin }: { isAdmin: boolean }) {
  const health = useHealth();
  const ok = !health.isError && health.data?.status === "ok";
  return (
    <Panel>
      <PanelHeader title="Platform health" actions={<HealthIndicator />} />
      <PanelBody className="py-2">
        <KeyValueList
          items={[
            {
              label: "Core API",
              value: (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    health.isLoading
                      ? "text-muted-foreground"
                      : ok
                        ? "text-emerald-700"
                        : "text-red-700",
                  )}
                >
                  <Activity className="size-3.5" aria-hidden />
                  {health.isLoading
                    ? "Checking…"
                    : ok
                      ? "Operational"
                      : "Unreachable"}
                </span>
              ),
            },
            { label: "Version", value: health.data?.version ?? "—" },
            {
              label: "Last check",
              value: health.dataUpdatedAt
                ? formatRelative(new Date(health.dataUpdatedAt).toISOString())
                : "—",
            },
            { label: "Token standard", value: "ERC-3643 / T-REX" },
          ]}
        />
        {isAdmin ? (
          <Button variant="outline" size="sm" className="my-3 w-full" asChild>
            <Link href="/admin/platform">Blockchain platform</Link>
          </Button>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
