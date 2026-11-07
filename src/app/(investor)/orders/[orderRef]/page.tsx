"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  CircleAlert,
  FileQuestion,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HashValue } from "@/components/app/hash-value";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/app/states";
import {
  OrderStatusBadge,
  RealEstateStatusBadge,
} from "@/components/app/status-badges";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useOrder, useRealEstate } from "@/lib/api/hooks";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRecordedMoney,
} from "@/lib/format";
import { hasPaymentCurrency, reservationDeadlineState } from "@/lib/order-book";
import { isOrderInFlight, orderStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";
import { OrderPaymentSection } from "../../_components/order-payment-section";
import { OrderTimeline } from "../../_components/order-timeline";
import { useNow } from "../../_components/use-now";

const FEE_LABEL: Record<string, string> = { ENTRY: "Entry fee" };

export default function OrderDetailPage() {
  const params = useParams<{ orderRef: string }>();
  const orderRef = params.orderRef ?? "";
  const query = useOrder(orderRef || undefined);
  const order = query.data;
  const estate = useRealEstate(order?.realEstateId);
  const now = useNow(1000, order?.statusCode === "AWAITING_PAYMENT");

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My orders", href: "/orders" },
    { label: orderRef },
  ];

  if (query.isLoading) return <PageSkeleton />;

  if (query.isError || !order) {
    const status =
      query.error instanceof ApiError ? query.error.status : undefined;
    return (
      <div>
        <PageHeader breadcrumbs={crumbs} title="Order" />
        <Panel>
          {status === 404 || status === 403 || !query.isError ? (
            <EmptyState
              icon={FileQuestion}
              title="Order not found"
              description={`No order with reference ${orderRef} is associated with your account.`}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/orders">
                    <ArrowLeft /> Back to my orders
                  </Link>
                </Button>
              }
            />
          ) : (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          )}
        </Panel>
      </div>
    );
  }

  const meta = orderStatusMeta(order.statusCode);
  const awaiting = order.statusCode === "AWAITING_PAYMENT";
  const live = isOrderInFlight(order.statusCode);
  const title =
    estate.data?.title ??
    order.realEstateTitle ??
    `Offering #${order.realEstateId}`;
  const tokenAddress =
    estate.data?.token?.address ?? estate.data?.contract_address;
  const cur = order.currencyCode;
  const deadline = reservationDeadlineState(order.reservationExpiresAt, now);
  const summary = awaiting
    ? deadline === "active"
      ? hasPaymentCurrency(order)
        ? `Payment of ${formatRecordedMoney(order.amountDue, cur)} is required by ${formatDateTime(order.reservationExpiresAt)}.`
        : "The payment currency is unavailable. Do not send a transfer until the order details can be confirmed."
      : deadline === "lapsed"
        ? "The reservation has ended. Wait for the order status to update before taking any action."
        : "The reservation deadline is unavailable. Check the order status before taking any action."
    : order.statusCode === "PAYMENT_CONFIRMED" ||
        order.statusCode === "DELIVERY_IN_PROGRESS"
      ? "Payment has been recorded. Delivery is being processed; no further payment is required."
      : order.statusCode === "DELIVERED" || order.statusCode === "CLOSED"
        ? "Your shares have been delivered."
        : order.statusCode === "REFUND_PENDING" ||
            order.statusCode === "REVERSAL_IN_PROGRESS"
          ? "A reversal or refund is being processed."
          : (meta.description ??
            "See the order status below for its progress.");

  return (
    <div>
      <PageHeader
        breadcrumbs={crumbs}
        eyebrow="Subscription order"
        title={<span className="font-mono">{order.orderRef}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge code={order.statusCode} />
            <span>
              {formatNumber(order.tokenQuantity)} shares of {title} · placed{" "}
              {formatDateTime(order.createdAt)}
            </span>
          </span>
        }
        actions={
          <>
            {live ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw
                  className={cn(
                    "size-3.5",
                    query.isFetching &&
                      "animate-spin motion-reduce:animate-none",
                  )}
                  aria-hidden
                />
                Auto-refreshing
              </span>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href="/orders">
                <ArrowLeft /> All orders
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <Panel>
          <PanelHeader title="Current status" description={summary} />
        </Panel>

        <OrderPaymentSection order={order} />

        <Panel>
          <PanelHeader title="Progress" description={meta.description} />
          <PanelBody>
            <OrderTimeline status={order.statusCode} />
            {order.statusCode === "DELIVERY_FAILED" ||
            order.statusCode === "REVERSAL_FAILED" ? (
              <div
                role="alert"
                className="mt-5 flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {meta.description ?? "This order requires investigation."}
              </div>
            ) : null}
          </PanelBody>
        </Panel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="min-w-0 space-y-6 lg:col-span-3">
            <Panel>
              <PanelHeader
                title="Amount breakdown"
                description={
                  hasPaymentCurrency(order)
                    ? `All amounts in ${cur}. Unit price fixed when the order was placed.`
                    : "Currency unavailable. Unit price fixed when the order was placed."
                }
              />
              <PanelBody>
                <KeyValueList
                  items={[
                    {
                      label: "Quantity",
                      value: `${formatNumber(order.tokenQuantity)} shares`,
                    },
                    {
                      label: "Unit price",
                      value: formatRecordedMoney(order.unitPrice, cur),
                    },
                    {
                      label: "Gross amount",
                      value: formatRecordedMoney(order.grossAmount, cur),
                    },
                    ...(order.fees?.length
                      ? order.fees.map((f) => ({
                          label: `${FEE_LABEL[f.code] ?? f.code} (${formatPercent(f.rate)})`,
                          value: formatRecordedMoney(f.amount, cur),
                          hint: `on ${formatRecordedMoney(f.baseAmount, cur)}`,
                        }))
                      : [
                          {
                            label: "Fees",
                            value: formatRecordedMoney("0", cur),
                          },
                        ]),
                  ]}
                />
                <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold text-ink">
                    Amount due
                  </span>
                  <span className="text-lg font-semibold text-ink tabular">
                    {formatRecordedMoney(order.amountDue, cur)}
                  </span>
                </div>
              </PanelBody>
            </Panel>
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Panel>
              <PanelHeader
                title="On-chain delivery"
                description="ERC-3643 security tokens minted to your on-chain identity."
              />
              <PanelBody>
                <KeyValueList
                  items={[
                    {
                      label: "Delivery transaction",
                      value: order.deliveryTxHash ? (
                        <HashValue value={order.deliveryTxHash} />
                      ) : (
                        <span className="text-muted-foreground">
                          {live ? "Pending" : "—"}
                        </span>
                      ),
                    },
                    {
                      label: "Token contract",
                      value: tokenAddress ? (
                        <HashValue value={tokenAddress} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      ),
                    },
                    {
                      label: "Token symbol",
                      value: estate.data?.token?.symbol ?? "—",
                    },
                    {
                      label: "Last update",
                      value: formatDateTime(order.updatedAt),
                    },
                  ]}
                />
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Offering" />
              <PanelBody className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{title}</div>
                    {estate.data?.location?.city ? (
                      <div className="text-xs text-muted-foreground">
                        {estate.data.location.city}
                      </div>
                    ) : null}
                  </div>
                  {estate.data ? (
                    <RealEstateStatusBadge status={estate.data.status} />
                  ) : null}
                </div>
                {estate.data?.configuration ? (
                  <KeyValueList
                    items={[
                      {
                        label: "Current share price",
                        value: formatRecordedMoney(
                          estate.data.configuration.price_per_share,
                          estate.data.configuration.currency_code,
                        ),
                      },
                      {
                        label: "Target yield",
                        value: formatPercent(estate.data.configuration.yield),
                      },
                    ]}
                  />
                ) : null}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/real-estate/${order.realEstateId}`}>
                    View offering <ArrowUpRight />
                  </Link>
                </Button>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Record" />
              <PanelBody>
                <KeyValueList
                  items={[
                    {
                      label: "Reference",
                      value: <HashValue value={order.orderRef} full />,
                    },
                    {
                      label: "Status",
                      value: meta.label,
                    },
                    {
                      label: "Created",
                      value: formatDateTime(order.createdAt),
                    },
                    {
                      label: "Reservation end",
                      value: formatDateTime(order.reservationExpiresAt),
                    },
                  ]}
                />
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
