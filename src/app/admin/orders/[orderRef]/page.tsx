"use client";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { HashValue } from "@/components/app/hash-value";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/app/states";
import {
  KycFileStatusBadge,
  OrderStatusBadge,
  RealEstateStatusBadge,
} from "@/components/app/status-badges";
import { TookenLoader } from "@/components/app/tooken-loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useOrder, useRealEstate } from "@/lib/api/hooks";
import type { IssuanceOrder } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRelative,
} from "@/lib/format";
import { isReservationLapsed, orderBucket } from "@/lib/order-book";
import { countryName } from "@/lib/reference";
import { isOrderInFlight, orderStatusMeta, orderTimeline } from "@/lib/status";
import { StepTimeline } from "../../_components/step-timeline";
import {
  investorLabel,
  useBackOfficeDirectory,
} from "../../_components/use-directory";
import { ConfirmPaymentDialog } from "../_components/confirm-payment-dialog";

type ObservedEvent = { at: string; status: string };

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderRef: string }>();
  const orderRef = decodeURIComponent(params.orderRef ?? "");
  const order = useOrder(orderRef);

  if (order.isPending) return <PageSkeleton />;
  if (order.isError) {
    const notFound =
      order.error instanceof ApiError && order.error.status === 404;
    return (
      <>
        <PageHeader
          title={orderRef}
          breadcrumbs={[
            { label: "Back office", href: "/admin" },
            { label: "Orders", href: "/admin/orders" },
            { label: orderRef },
          ]}
        />
        <Panel>
          {notFound ? (
            <EmptyState
              title="Order not found"
              description={`No order matches the reference ${orderRef}.`}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/orders">
                    <ArrowLeft /> Back to the order book
                  </Link>
                </Button>
              }
            />
          ) : (
            <ErrorState error={order.error} onRetry={() => order.refetch()} />
          )}
        </Panel>
      </>
    );
  }
  return <OrderDetail order={order.data} />;
}

function OrderDetail({ order }: { order: IssuanceOrder }) {
  const { isAdmin } = useSession();
  const { investors, canSeeInvestors } = useBackOfficeDirectory();
  const estate = useRealEstate(order.realEstateId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const observed = useObservedStatuses(order);

  const investor = investors.get(order.userId);
  const meta = orderStatusMeta(order.statusCode);
  const inFlight = isOrderInFlight(order.statusCode);
  const awaiting = order.statusCode === "AWAITING_PAYMENT";
  const settling = inFlight && !awaiting && order.statusCode !== "CREATED";
  const lapsed = isReservationLapsed(order);
  const token = estate.data?.token;
  const currency = order.currencyCode;

  const steps = orderTimeline(order.statusCode).map((s) => ({
    ...s,
    hint:
      s.key === "placed"
        ? formatDateTime(order.createdAt)
        : s.key === "payment" && awaiting
          ? lapsed
            ? "Reservation lapsed"
            : `Due ${formatRelative(order.reservationExpiresAt)}`
          : s.key === "settled" && s.state === "done"
            ? formatDateTime(order.updatedAt)
            : undefined,
  }));

  const audit = useMemo(() => {
    const rows: { at: string; label: string; detail?: React.ReactNode }[] = [
      {
        at: order.createdAt,
        label: "Order placed",
        detail: `${formatNumber(order.tokenQuantity)} tokens at ${formatMoney(order.unitPrice, currency, { decimals: 2 })}${order.createdBy ? ` · by user #${order.createdBy}` : ""}`,
      },
    ];
    // The reservation only matters while unpaid, or to explain an expiry.
    if (
      order.reservationExpiresAt &&
      (orderBucket(order.statusCode) === "awaiting" ||
        order.statusCode === "EXPIRED")
    ) {
      rows.push({
        at: order.reservationExpiresAt,
        label: "Reservation expiry",
        detail: "Unpaid orders expire and release their shares",
      });
    }
    for (const e of observed) {
      rows.push({
        at: e.at,
        label: `Observed: ${orderStatusMeta(e.status).label}`,
        detail: "Status change seen in this session",
      });
    }
    rows.push({
      at: order.updatedAt,
      label: "Last status update",
      detail: order.statusLabel ?? meta.label,
    });
    return rows.sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }, [order, observed, currency, meta.label]);

  return (
    <>
      <PageHeader
        eyebrow="Issuance order"
        title={<span className="font-mono">{order.orderRef}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge code={order.statusCode} />
            <span>{meta.description}</span>
          </span>
        }
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Orders", href: "/admin/orders" },
          { label: order.orderRef },
        ]}
        actions={
          awaiting ? (
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand-light"
              onClick={() => setConfirmOpen(true)}
              disabled={!isAdmin}
              title={isAdmin ? undefined : "Requires administrator rights"}
            >
              <Banknote /> Confirm payment received
            </Button>
          ) : null
        }
      />

      <div className="space-y-6">
        <Panel>
          <PanelHeader
            title="Settlement progression"
            description={
              inFlight
                ? "Live — refreshed automatically every few seconds."
                : `Last update ${formatDateTime(order.updatedAt)}`
            }
            actions={
              inFlight ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-cyan-500" />
                  </span>
                  Live
                </span>
              ) : null
            }
          />
          <PanelBody className="space-y-5">
            <StepTimeline steps={steps} live={settling} />
            {awaiting ? (
              <Alert
                className={
                  lapsed
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50"
                }
              >
                {lapsed ? <ShieldAlert /> : <Clock />}
                <AlertTitle>
                  {lapsed
                    ? "Reservation lapsed"
                    : `Awaiting a transfer of ${formatMoney(order.amountDue, currency)}`}
                </AlertTitle>
                <AlertDescription>
                  {lapsed
                    ? "The reservation has ended: the backend will refuse a payment confirmation and expire the order."
                    : `Shares are reserved until ${formatDateTime(order.reservationExpiresAt)}. Match the incoming transfer with reference ${order.orderRef} before confirming.`}
                </AlertDescription>
              </Alert>
            ) : settling ? (
              <Alert className="border-cyan-200 bg-cyan-50">
                <TookenLoader size={16} />
                <AlertTitle>Settlement in progress</AlertTitle>
                <AlertDescription>
                  Payment recorded. Security tokens are being minted to the
                  investor&apos;s wallet; this page updates on its own.
                </AlertDescription>
              </Alert>
            ) : order.statusCode === "CLOSED" ? (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="text-emerald-600" />
                <AlertTitle>Order settled</AlertTitle>
                <AlertDescription>
                  {order.deliveryTxHash ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      Delivery transaction
                      <HashValue value={order.deliveryTxHash} size={10} />
                    </span>
                  ) : (
                    "Tokens have been delivered."
                  )}
                </AlertDescription>
              </Alert>
            ) : meta.tone === "danger" ? (
              <Alert variant="destructive">
                <ShieldAlert />
                <AlertTitle>{meta.label}</AlertTitle>
                <AlertDescription>
                  {meta.description ?? "This order needs investigation."}
                </AlertDescription>
              </Alert>
            ) : null}
          </PanelBody>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Panel>
              <PanelHeader
                title="Amount breakdown"
                description="Amounts are frozen when the order is placed."
              />
              <PanelBody className="py-2">
                <KeyValueList
                  items={[
                    {
                      label: "Quantity",
                      value: `${formatNumber(order.tokenQuantity)} tokens`,
                    },
                    {
                      label: "Unit price",
                      value: formatMoney(order.unitPrice, currency, {
                        decimals: 2,
                      }),
                      hint: `${order.unitPrice} ${currency}`,
                    },
                    {
                      label: "Gross amount",
                      value: formatMoney(order.grossAmount, currency),
                    },
                    ...(order.fees.length
                      ? order.fees.map((f) => ({
                          label: `${f.code === "ENTRY" ? "Entry fee" : f.code} (${formatPercent(f.rate)})`,
                          value: formatMoney(f.amount, currency),
                          hint: `on ${formatMoney(f.baseAmount, currency)}`,
                        }))
                      : [
                          {
                            label: "Fees",
                            value: formatMoney(order.feeAmount, currency),
                          },
                        ]),
                    {
                      label: (
                        <span className="font-semibold text-ink">
                          Amount due
                        </span>
                      ),
                      value: (
                        <span className="text-base font-semibold">
                          {formatMoney(order.amountDue, currency)}
                        </span>
                      ),
                    },
                  ]}
                />
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="On-chain delivery"
                description="ERC-3643 security token minted to the investor's identity."
              />
              <PanelBody className="py-2">
                <KeyValueList
                  items={[
                    {
                      label: "Delivery transaction",
                      value: order.deliveryTxHash ? (
                        <HashValue value={order.deliveryTxHash} size={10} />
                      ) : (
                        <span className="text-muted-foreground">
                          {settling ? "Pending signature…" : "Not minted"}
                        </span>
                      ),
                    },
                    {
                      label: "Token",
                      value: token?.symbol
                        ? `${token.token_name ?? ""} (${token.symbol})`
                        : estate.isPending
                          ? "…"
                          : "—",
                    },
                    {
                      label: "Token contract",
                      value: (
                        <HashValue
                          value={
                            token?.address ?? estate.data?.contract_address
                          }
                        />
                      ),
                    },
                    {
                      label: "Decimals",
                      value:
                        token?.nb_decimal !== undefined
                          ? String(token.nb_decimal)
                          : "—",
                    },
                  ]}
                />
                <p className="pt-2 pb-1 text-xs text-muted-foreground">
                  A hash is stored as soon as the mint is signed: verify it on
                  chain before treating it as final.
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Audit trail"
                description="Timestamps recorded on the order."
              />
              <PanelBody>
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {audit.map((e) => (
                    <li key={`${e.label}-${e.at}`} className="relative">
                      <span
                        aria-hidden
                        className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-ink/40"
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <span className="text-sm font-medium text-ink">
                          {e.label}
                        </span>
                        <time
                          dateTime={e.at}
                          className="text-xs text-muted-foreground tabular"
                        >
                          {formatDateTime(e.at)}
                        </time>
                      </div>
                      {e.detail ? (
                        <div className="text-xs text-muted-foreground">
                          {e.detail}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </PanelBody>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel>
              <PanelHeader title="Investor" />
              <PanelBody className="py-2">
                <KeyValueList
                  items={[
                    {
                      label: "Name",
                      value: investor?.fullName ?? "—",
                    },
                    {
                      label: "E-mail",
                      value: investor?.email ? (
                        <a
                          href={`mailto:${investor.email}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {investor.email}
                        </a>
                      ) : (
                        "—"
                      ),
                    },
                    {
                      label: "Country",
                      value: countryName(investor?.countryCode),
                    },
                    { label: "User ID", value: `#${order.userId}` },
                    {
                      label: "KYC file",
                      value: investor?.kycId ? (
                        <span className="inline-flex items-center gap-2">
                          <KycFileStatusBadge status={investor.kycStatus} />
                          <Link
                            href={`/admin/compliance/${investor.kycId}`}
                            className="text-xs underline-offset-4 hover:underline"
                          >
                            #{investor.kycId}
                          </Link>
                        </span>
                      ) : (
                        "—"
                      ),
                    },
                  ]}
                />
                {!canSeeInvestors ? (
                  <p className="pt-2 pb-1 text-xs text-muted-foreground">
                    Investor identity details are restricted to administrators.
                  </p>
                ) : null}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Offering" />
              <PanelBody className="py-2">
                <KeyValueList
                  items={[
                    {
                      label: "Asset",
                      value: (
                        <Link
                          href={`/admin/assets/${order.realEstateId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {estate.data?.title ??
                            order.realEstateTitle ??
                            `#${order.realEstateId}`}
                        </Link>
                      ),
                    },
                    {
                      label: "Status",
                      value: estate.data ? (
                        <RealEstateStatusBadge status={estate.data.status} />
                      ) : (
                        "—"
                      ),
                    },
                    {
                      label: "Currency",
                      value: currency,
                    },
                  ]}
                />
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>

      <ConfirmPaymentDialog
        order={order}
        investorLabel={investorLabel(order.userId, investor)}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </>
  );
}

/** Records status changes seen while polling, to complement the backend timestamps. */
function useObservedStatuses(order: IssuanceOrder): ObservedEvent[] {
  const [events, setEvents] = useState<ObservedEvent[]>([]);
  const [last, setLast] = useState(order.statusCode);
  if (last !== order.statusCode) {
    setLast(order.statusCode);
    setEvents((prev) => [
      ...prev,
      { at: new Date().toISOString(), status: order.statusCode },
    ]);
  }
  return events;
}
