"use client";

import { ArrowUpRight, Building2, CircleAlert } from "lucide-react";
import Link from "next/link";
import { HashValue } from "@/components/app/hash-value";
import { ImageWithLoader } from "@/components/app/image-with-loader";
import { KeyValueList } from "@/components/app/key-value";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { RealEstateStatusBadge } from "@/components/app/status-badges";
import { TookenLoader } from "@/components/app/tooken-loader";
import { Button } from "@/components/ui/button";
import type { IssuanceOrder, RealEstate } from "@/lib/api/types";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRecordedMoney,
} from "@/lib/format";
import { hasPaymentCurrency } from "@/lib/order-book";
import { isOrderInFlight, orderStatusMeta } from "@/lib/status";
import { OrderPaymentSection } from "./order-payment-section";
import { OrderTimeline } from "./order-timeline";

const FEE_LABEL: Record<string, string> = { ENTRY: "Entry fee" };

export type OrderDetailLayoutProps = {
  order: IssuanceOrder;
  estateData: RealEstate | undefined;
  estateLoading: boolean;
  title: string;
  cover: string | undefined;
  tokenAddress: string | undefined;
  summary: string;
};

// Saved classic layout with Amount breakdown on the left and three stacked panels on the right.
export function OrderDetailClassicLayout({
  order,
  estateData,
  estateLoading,
  title,
  cover,
  tokenAddress,
  summary,
}: OrderDetailLayoutProps) {
  const meta = orderStatusMeta(order.statusCode);
  const live = isOrderInFlight(order.statusCode);
  const cur = order.currencyCode;

  return (
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
                    value: estateData?.token?.symbol ?? "—",
                  },
                  {
                    label: "Last update",
                    value: formatDateTime(order.updatedAt),
                  },
                ]}
              />
            </PanelBody>
          </Panel>

          <Panel className="overflow-hidden">
            <PanelHeader title="Offering" />
            <Link
              href={`/real-estate/${order.realEstateId}`}
              className="group relative block aspect-[16/10] overflow-hidden border-b border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              aria-label={`View ${title}`}
            >
              {estateLoading ? (
                <span
                  aria-hidden
                  className="flex size-full items-center justify-center"
                >
                  <TookenLoader size={32} />
                </span>
              ) : cover ? (
                <ImageWithLoader
                  src={cover}
                  alt={title}
                  fill
                  sizes="(min-width: 1024px) 380px, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                  loaderSize={32}
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-full items-center justify-center bg-ink"
                >
                  <Building2 className="size-9 text-white/25" />
                </span>
              )}
            </Link>
            <PanelBody className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{title}</div>
                  {estateData?.location?.city ? (
                    <div className="text-xs text-muted-foreground">
                      {estateData.location.city}
                    </div>
                  ) : null}
                </div>
                {estateData ? (
                  <RealEstateStatusBadge status={estateData.status} />
                ) : null}
              </div>
              {estateData?.configuration ? (
                <KeyValueList
                  items={[
                    {
                      label: "Current share price",
                      value: formatRecordedMoney(
                        estateData.configuration.price_per_share,
                        estateData.configuration.currency_code,
                      ),
                    },
                    {
                      label: "Target yield",
                      value: formatPercent(estateData.configuration.yield),
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
  );
}
