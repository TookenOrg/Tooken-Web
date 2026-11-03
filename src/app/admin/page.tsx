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
  formatRelative,
} from "@/lib/format";
import { needsOnChainSync } from "@/lib/kyc-review";
import { countryName } from "@/lib/reference";
import { isOrderSettled } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Exact sums grouped by currency; malformed amounts are skipped. */
function sumByCurrency(
  items: { amount: string | undefined; currency: string | undefined }[],
): Map<string, string> {
  const totals = new Map<string, string>();
  for (const { amount, currency } of items) {
    if (!amount) continue;
    const ccy = currency || "EUR";
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
  totals: Map<string, string>;
  compact?: boolean;
}) {
  const entries = [...totals.entries()];
  if (!entries.length) return <>{formatMoney("0", "EUR", { decimals: 0 })}</>;
  return (
    <>
      {entries
        .map(([ccy, v]) => formatMoney(v, ccy, { decimals: 0, compact }))
        .join(" · ")}
    </>
  );
}

type Action = {
  key: string;
  href: string;
  icon: typeof Wallet;
  tone: string;
  title: string;
  detail: string;
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

  const actions: Action[] = [
    ...awaiting.map((o) => ({
      key: `order-${o.orderRef}`,
      href: `/admin/orders/${encodeURIComponent(o.orderRef)}`,
      icon: Wallet,
      tone: "bg-amber-50 text-amber-700",
      title: `Confirm payment · ${o.orderRef}`,
      detail: `${formatMoney(o.amountDue, o.currencyCode)} · ${o.realEstateTitle ?? `Asset #${o.realEstateId}`} · reservation ends ${formatRelative(o.reservationExpiresAt)}`,
    })),
    ...(isAdmin
      ? pendingKyc.map((k) => ({
          key: `kyc-${k.id}`,
          href: `/admin/compliance/${k.id}`,
          icon: FileCheck2,
          tone: "bg-cyan-50 text-cyan-700",
          title: `Review KYC · ${k.declared_full_name ?? k.email ?? `File #${k.id}`}`,
          detail: `${countryName(k.declared_country_code)} · submitted ${formatRelative(k.submitted_at)}`,
        }))
      : []),
    ...syncKyc.map((k) => ({
      key: `sync-kyc-${k.id}`,
      href: `/admin/compliance/${k.id}`,
      icon: RefreshCw,
      tone: "bg-cyan-50 text-cyan-700",
      title: `Sync KYC · ${k.declared_full_name ?? k.email ?? `File #${k.id}`}`,
      detail: "Approved. Register the investor on-chain to enable investing.",
    })),
    ...drafts.map((r) => ({
      key: `draft-${r.id}`,
      href: `/admin/assets/${r.id}`,
      icon: Rocket,
      tone: "bg-slate-100 text-slate-700",
      title: `Publish draft · ${r.title ?? `#${r.id}`}`,
      detail: "Complete, then tokenize to make it investable.",
    })),
    ...published.map((r) => ({
      key: `open-${r.id}`,
      href: `/admin/assets/${r.id}`,
      icon: Unlock,
      tone: "bg-emerald-50 text-emerald-700",
      title: `Open fundraising · ${r.title ?? `#${r.id}`}`,
      detail: "Token deployed. Subscriptions are not open yet.",
    })),
  ];

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
        <div className={cn("grid gap-4 sm:grid-cols-2", "xl:grid-cols-3")}>
          <StatCard
            label="Offerings"
            icon={Building2}
            loading={estates.isLoading}
            value={formatNumber(assets.length)}
            hint={`${drafts.length} draft · ${published.length} published · ${fundraising.length} fundraising`}
          />
          <StatCard
            label="Valuation under management"
            icon={Landmark}
            accent="brand"
            loading={estates.isLoading}
            value={<MoneyTotals totals={valuation} />}
            hint="Sum of asset valuations, all statuses"
          />
          <StatCard
            label="Issuers"
            icon={BadgeCheck}
            loading={issuers.isLoading}
            value={formatNumber(issuers.data?.length ?? 0)}
            hint={`${activeIssuers} active`}
          />
          <StatCard
            label="Awaiting payment"
            icon={Clock}
            accent="brand"
            loading={orders.isLoading}
            value={formatNumber(awaiting.length)}
            hint={
              awaiting.length ? (
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
            value={formatNumber(settled.length)}
            hint={
              <>
                <MoneyTotals totals={settledVolume} /> subscribed
              </>
            }
          />
          {isAdmin ? (
            <StatCard
              label="KYC pending review"
              icon={FileCheck2}
              accent="signal"
              loading={kyc.isLoading}
              value={formatNumber(pendingKyc.length)}
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
              value={formatNumber(fundraising.length)}
              hint="Offerings open for subscription"
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
            <Panel>
              <PanelHeader
                title="Action required"
                description="Items waiting on an operator."
                actions={
                  actions.length ? (
                    <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-white tabular">
                      {actions.length}
                    </span>
                  ) : null
                }
              />
              {estates.isLoading ||
              orders.isLoading ||
              (isAdmin && kyc.isLoading) ||
              syncDetails.some((q) => q.isLoading) ? (
                <TableSkeleton rows={3} cols={1} />
              ) : kycError ? (
                <ErrorState
                  error={kycError}
                  onRetry={() => {
                    kyc.refetch();
                    for (const q of syncDetails) q.refetch();
                  }}
                />
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
                        className="group flex items-center gap-3 px-5 py-3 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
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
                          <span className="block truncate text-sm font-medium text-ink">
                            {a.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {a.detail}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                  {actions.length > 8 ? (
                    <li className="px-5 py-2.5 text-xs text-muted-foreground">
                      +{actions.length - 8} more
                    </li>
                  ) : null}
                </ul>
              )}
            </Panel>
            <PlatformHealth isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </>
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
        <div className="overflow-x-auto">
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
                    {formatMoney(o.amountDue, o.currencyCode)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap pr-5 text-sm text-muted-foreground">
                    {formatDateTime(o.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
        <div className="overflow-x-auto">
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
                const sold = r.progression?.tokens_sold ?? 0;
                const pct = Number(r.progression?.tokens_sold_pctg ?? 0);
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
                        <Progress
                          value={Math.min(100, pct)}
                          aria-label={`${pct} % subscribed`}
                          className="h-1.5 bg-muted [&>div]:bg-emerald-600"
                        />
                        <p className="text-xs text-muted-foreground tabular">
                          {formatNumber(sold)} / {formatNumber(c?.total_shares)}{" "}
                          · {formatNumber(pct, 2)} %
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap pr-5 text-right font-medium tabular">
                      {formatMoney(c?.total_valuation, c?.currency_code, {
                        decimals: 0,
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
