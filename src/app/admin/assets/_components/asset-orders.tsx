"use client";

import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { OrderStatusBadge } from "@/components/app/status-badges";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrders } from "@/lib/api/hooks";
import type { RealEstate } from "@/lib/api/types";
import {
  formatDateTime,
  formatNumber,
  formatRecordedMoney,
} from "@/lib/format";
import { subscriptionFill } from "./asset-metrics";

export function AssetOrders({ asset }: { asset: RealEstate }) {
  const orders = useOrders();
  const rows = (orders.data ?? [])
    .filter((o) => o.realEstateId === asset.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = asset.configuration?.total_shares;
  const fill = orders.data ? subscriptionFill(rows, total) : null;
  const totalAvailable = !!total && /^\d+$/.test(total) && BigInt(total) > 0n;

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Subscription progress"
          description="Shares held by live orders (cancelled, expired and refunded orders excluded)."
        />
        {orders.isLoading ? (
          <PanelBody>
            <p className="text-sm text-muted-foreground">
              Loading subscription progress…
            </p>
          </PanelBody>
        ) : orders.isError || !fill ? (
          <ErrorState
            error={orders.error ?? new Error("Order information unavailable.")}
            onRetry={() => orders.refetch()}
          />
        ) : (
          <PanelBody className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-2xl font-semibold text-ink tabular">
                {totalAvailable ? `${fill.percent} %` : "—"}
              </p>
              <p className="text-sm text-muted-foreground tabular">
                {formatNumber(fill.subscribed.toString())} /{" "}
                {formatNumber(total)} shares
              </p>
            </div>
            {totalAvailable ? (
              <Progress
                value={Math.min(100, Number(fill.percent))}
                aria-label="Subscription progress"
                className="h-2.5 bg-muted [&>div]:bg-emerald-600"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                The total share count is unavailable, so the percentage cannot
                be calculated.
              </p>
            )}
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Settled</dt>
                <dd className="font-medium text-ink tabular">
                  {formatNumber(fill.settled.toString())} shares
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reserved, in progress</dt>
                <dd className="font-medium text-ink tabular">
                  {formatNumber(fill.reserved.toString())} shares
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Live orders</dt>
                <dd className="font-medium text-ink tabular">
                  {fill.orderCount}
                </dd>
              </div>
            </dl>
          </PanelBody>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Orders"
          description="All orders placed on this asset."
        />
        {orders.isLoading ? (
          <TableSkeleton rows={3} cols={6} />
        ) : orders.isError || !orders.data ? (
          <ErrorState
            error={orders.error ?? new Error("Order information unavailable.")}
            onRetry={() => orders.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No order yet"
            description="Orders appear here once investors subscribe during fundraising."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Reference</TableHead>
                  <TableHead>Investor</TableHead>
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
                        className="font-mono text-xs font-medium text-ink hover:underline"
                      >
                        {o.orderRef}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular">
                      User #{o.userId}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge code={o.statusCode} />
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {formatNumber(o.tokenQuantity)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular">
                      {formatRecordedMoney(o.amountDue, o.currencyCode)}
                    </TableCell>
                    <TableCell className="pr-5 text-sm text-muted-foreground">
                      {formatDateTime(o.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}
