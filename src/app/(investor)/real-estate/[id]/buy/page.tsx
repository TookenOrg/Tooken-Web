"use client";

import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  Minus,
  Plus,
  ShieldAlert,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import {
  estateCover,
  estateLocation,
  fundingPercent,
} from "@/components/app/real-estate-card";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/app/states";
import {
  KycStatusBadge,
  OrderStatusBadge,
} from "@/components/app/status-badges";
import { TookenLoader } from "@/components/app/tooken-loader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ApiError, errorMessage, newIdempotencyKey } from "@/lib/api/client";
import { useCreateOrder, useOrders, useRealEstate } from "@/lib/api/hooks";
import type { IssuanceOrder, RealEstate } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import {
  addDecimal,
  formatFrequency,
  formatMoney,
  formatNumber,
  formatPercent,
  multiplyDecimal,
  percentOf,
  remainingShares,
} from "@/lib/format";
import { offeringTerms } from "@/lib/offering-terms";
import {
  committedShares,
  investmentShareBounds,
  maxSubscribable,
} from "@/lib/portfolio";
import { canInvest } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ReservationCountdown } from "../../../_components/reservation-countdown";
import { SettlementInstructions } from "../../../_components/settlement-instructions";

type Step = "amount" | "review" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "amount", label: "Amount" },
  { key: "review", label: "Review" },
  { key: "done", label: "Confirmation" },
];

const QUICK_PICKS = [1, 10, 25, 50, 100, 250];

type Intent = { quantity: number; key: string };
const intentKey = (estateId: number) => `tooken:order-intent:${estateId}`;

function loadIntent(estateId: number): Intent | null {
  try {
    const raw = window.sessionStorage.getItem(intentKey(estateId));
    const parsed = raw ? (JSON.parse(raw) as Intent) : null;
    return parsed && typeof parsed.key === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function saveIntent(estateId: number, intent: Intent | null) {
  try {
    if (intent) {
      window.sessionStorage.setItem(
        intentKey(estateId),
        JSON.stringify(intent),
      );
    } else {
      window.sessionStorage.removeItem(intentKey(estateId));
    }
  } catch {
    // Storage unavailable: the key still lives in component state.
  }
}

/**
 * One Idempotency-Key per order intent: kept while the quantity is unchanged
 * so a retry replays the same order instead of creating a second one.
 */
function intentFor(estateId: number, quantity: number): Intent {
  const stored = loadIntent(estateId);
  if (stored && stored.quantity === quantity) return stored;
  const intent = { quantity, key: newIdempotencyKey() };
  saveIntent(estateId, intent);
  return intent;
}

function describeError(error: unknown): { title: string; body: string } {
  const status = error instanceof ApiError ? error.status : 0;
  const detail = errorMessage(error);
  switch (status) {
    case 403:
      return {
        title: "Subscription not permitted",
        body: `${detail} Only investors with a valid identity verification can subscribe.`,
      };
    case 409:
      return {
        title: "The order conflicts with the offering",
        body: `${detail} Not enough shares may be left, or the per-investor limit may be reached.`,
      };
    case 400:
    case 422:
      return { title: "The order was rejected", body: detail };
    default:
      return {
        title: "The order could not be placed",
        body: `${detail} You can retry safely: the same order will not be placed twice.`,
      };
  }
}

export default function BuyPage() {
  const params = useParams<{ id: string }>();
  const estateId = Number(params.id);
  const valid = Number.isInteger(estateId) && estateId > 0;
  const { user, userLoading, isInvestor } = useSession();
  const estate = useRealEstate(valid ? estateId : undefined);
  const orders = useOrders(isInvestor);

  const crumbs = [
    { label: "Marketplace", href: "/explore" },
    ...(estate.data
      ? [
          {
            label: estate.data.title ?? `Offering #${estateId}`,
            href: `/real-estate/${estateId}`,
          },
        ]
      : []),
    { label: "Subscribe" },
  ];

  if (!valid) {
    return (
      <Blocking
        crumbs={crumbs}
        icon={Ban}
        title="Offering not found"
        description="This offering does not exist."
      />
    );
  }
  if (estate.isLoading || userLoading || !user) return <PageSkeleton />;
  if (estate.isError || !estate.data) {
    const notFound =
      estate.error instanceof ApiError && estate.error.status === 404;
    return notFound ? (
      <Blocking
        crumbs={crumbs}
        icon={Ban}
        title="Offering not found"
        description="This offering does not exist or is no longer published."
      />
    ) : (
      <div>
        <PageHeader breadcrumbs={crumbs} title="Subscribe" />
        <Panel>
          <ErrorState error={estate.error} onRetry={() => estate.refetch()} />
        </Panel>
      </div>
    );
  }

  const e = estate.data;
  if (!canInvest(user.kyc_status, user.kyc_expires_at)) {
    return (
      <Blocking
        crumbs={crumbs}
        icon={ShieldAlert}
        title="Identity verification required"
        description={
          <span className="flex flex-col items-center gap-2">
            <span>
              Security tokens can only be issued to verified investors. Complete
              or renew your verification to subscribe to {e.title}.
            </span>
            <KycStatusBadge
              status={
                user.kyc_status === "verified" ? "expired" : user.kyc_status
              }
            />
          </span>
        }
        action={
          <Button
            asChild
            className="bg-brand text-brand-foreground hover:bg-brand-light"
          >
            <Link href="/verification">
              Go to identity verification <ArrowRight />
            </Link>
          </Button>
        }
      />
    );
  }
  if (e.status !== "fundraising") {
    return (
      <Blocking
        crumbs={crumbs}
        icon={Ban}
        title="Not open for subscription"
        description={`${e.title ?? "This offering"} is not accepting subscriptions at the moment.`}
        action={
          <Button asChild variant="outline">
            <Link href={`/real-estate/${estateId}`}>
              <ArrowLeft /> Back to the offering
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <SubscriptionFlow
      estate={e}
      crumbs={crumbs}
      committed={committedShares(orders.data, estateId)}
    />
  );
}

function Blocking({
  crumbs,
  icon,
  title,
  description,
  action,
}: {
  crumbs: { label: string; href?: string }[];
  icon: typeof Ban;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader breadcrumbs={crumbs} title="Subscribe" />
      <Panel className="mx-auto max-w-2xl">
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          action={
            action ?? (
              <Button asChild variant="outline">
                <Link href="/explore">
                  <ArrowLeft /> Back to the marketplace
                </Link>
              </Button>
            )
          }
        />
      </Panel>
    </div>
  );
}

function SubscriptionFlow({
  estate,
  crumbs,
  committed,
}: {
  estate: RealEstate;
  crumbs: { label: string; href?: string }[];
  committed: number;
}) {
  const cfg = estate.configuration ?? {};
  const currency = cfg.currency_code || "EUR";
  const price = cfg.price_per_share ?? "0";
  const maxPerInvestor = Number.parseInt(cfg.max_shares_per_investor ?? "", 10);
  const remaining = cfg.total_shares
    ? remainingShares(cfg.total_shares, estate.progression?.tokens_sold)
    : null;
  const bounds = investmentShareBounds({
    price: cfg.price_per_share,
    minInvestment: cfg.min_investment,
    maxInvestment: cfg.max_investment,
  });
  const minQty = bounds.min;
  const capped = maxSubscribable({
    maxPerInvestor: Number.isFinite(maxPerInvestor) ? maxPerInvestor : null,
    remaining,
    committed,
  });
  const max = bounds.max === null ? capped : Math.min(capped, bounds.max);
  const entryFeeRate = cfg.entry_fee_rate?.trim() || null;

  const [step, setStep] = useState<Step>("amount");
  const [quantity, setQuantity] = useState(minQty);
  const [raw, setRaw] = useState(String(minQty));
  const [ack, setAck] = useState({ risk: false, terms: false });
  const [intent, setIntent] = useState<Intent | null>(null);
  const [placed, setPlaced] = useState<IssuanceOrder | null>(null);
  const create = useCreateOrder();

  const title = estate.title ?? `Offering #${estate.id}`;
  const outOfRange = quantity < minQty || quantity > max;
  const gross = useMemo(() => {
    try {
      return multiplyDecimal(price, Math.max(0, quantity));
    } catch {
      return "0";
    }
  }, [price, quantity]);
  const entryFee = useMemo(() => {
    if (!entryFeeRate) return null;
    try {
      return percentOf(gross, entryFeeRate);
    } catch {
      return null;
    }
  }, [gross, entryFeeRate]);

  useEffect(() => {
    if (step !== "amount") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const setQty = (n: number) => {
    const v = Math.max(0, Math.floor(n));
    setQuantity(v);
    setRaw(String(v));
  };

  const toReview = () => {
    if (outOfRange) return;
    setIntent(intentFor(estate.id, quantity));
    setAck({ risk: false, terms: false });
    create.reset();
    setStep("review");
  };

  const submit = () => {
    const current = intent ?? intentFor(estate.id, quantity);
    setIntent(current);
    create.mutate(
      {
        realEstateId: estate.id,
        quantity: current.quantity,
        idempotencyKey: current.key,
      },
      {
        onSuccess: (order) => {
          saveIntent(estate.id, null);
          setPlaced(order);
          setStep("done");
        },
        onError: (error) => {
          // A definitive refusal ends the intent; transient failures keep the
          // key so the retry is deduplicated by the backend.
          const status = error instanceof ApiError ? error.status : 0;
          if (
            status >= 400 &&
            status < 500 &&
            status !== 408 &&
            status !== 429
          ) {
            saveIntent(estate.id, null);
            setIntent(null);
          }
        },
      },
    );
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const failure = create.isError ? describeError(create.error) : null;

  return (
    <div>
      <PageHeader
        breadcrumbs={crumbs}
        eyebrow="Subscription"
        title={title}
        description="Subscribe to security tokens representing shares of this real-estate vehicle."
      />

      <ol className="mb-6 flex items-center gap-2 text-sm" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li
            key={s.key}
            className="flex items-center gap-2"
            aria-current={i === stepIndex ? "step" : undefined}
          >
            {i > 0 ? (
              <span className="h-px w-6 bg-border sm:w-12" aria-hidden />
            ) : null}
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular",
                i < stepIndex && "bg-emerald-500 text-white",
                i === stepIndex && "bg-ink text-white",
                i > stepIndex && "bg-muted text-muted-foreground",
              )}
            >
              {i < stepIndex ? <CheckCircle2 className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden sm:inline",
                i === stepIndex
                  ? "font-medium text-ink"
                  : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {step === "amount" ? (
            <Panel>
              <PanelHeader
                title="How many shares?"
                description={`One share = ${formatMoney(price, currency)}. Whole shares only.`}
              />
              <PanelBody className="space-y-6">
                {max < minQty ? (
                  <div
                    role="alert"
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
                  >
                    {remaining === 0
                      ? "All shares of this offering have been subscribed."
                      : max === 0
                        ? "You have reached the maximum number of shares per investor for this offering."
                        : `The shares still available to you are below the minimum investment of ${formatMoney(cfg.min_investment, currency)}.`}
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label
                    htmlFor="quantity"
                    className="text-xs font-medium text-ink/80"
                  >
                    Number of shares
                  </Label>
                  <div className="flex items-stretch gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      onClick={() => setQty(quantity - 1)}
                      disabled={quantity <= minQty}
                      aria-label="Decrease quantity"
                    >
                      <Minus />
                    </Button>
                    <Input
                      id="quantity"
                      inputMode="numeric"
                      value={raw}
                      onChange={(ev) => {
                        const v = ev.target.value.replace(/[^\d]/g, "");
                        setRaw(v);
                        setQuantity(v ? Number.parseInt(v, 10) : 0);
                      }}
                      onBlur={() => setRaw(String(quantity))}
                      className="h-10 max-w-40 text-center text-lg font-semibold tabular"
                      aria-invalid={outOfRange}
                      aria-describedby="quantity-hint"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      onClick={() => setQty(quantity + 1)}
                      disabled={quantity >= max}
                      aria-label="Increase quantity"
                    >
                      <Plus />
                    </Button>
                  </div>
                  <p
                    id="quantity-hint"
                    className={cn(
                      "text-xs",
                      outOfRange && max > 0
                        ? "text-red-600"
                        : "text-muted-foreground",
                    )}
                  >
                    {max >= minQty && max < Number.MAX_SAFE_INTEGER
                      ? `Between ${formatNumber(minQty)} and ${formatNumber(max)} shares.`
                      : `At least ${formatNumber(minQty)} share${minQty > 1 ? "s" : ""}.`}
                    {cfg.min_investment || cfg.max_investment
                      ? ` Investment limits: ${[
                          cfg.min_investment &&
                            `min. ${formatMoney(cfg.min_investment, currency)}`,
                          cfg.max_investment &&
                            `max. ${formatMoney(cfg.max_investment, currency)}`,
                        ]
                          .filter(Boolean)
                          .join(", ")}.`
                      : ""}
                    {committed > 0
                      ? ` You already hold or have reserved ${formatNumber(committed)} shares of this offering.`
                      : ""}
                  </p>
                </div>

                <fieldset className="flex flex-wrap gap-2">
                  <legend className="sr-only">Quick picks</legend>
                  {QUICK_PICKS.filter((n) => n >= minQty && n <= max).map(
                    (n) => (
                      <Button
                        key={n}
                        type="button"
                        size="sm"
                        variant={quantity === n ? "default" : "outline"}
                        onClick={() => setQty(n)}
                        className="tabular"
                      >
                        {formatNumber(n)}
                      </Button>
                    ),
                  )}
                  {max >= minQty && max < Number.MAX_SAFE_INTEGER ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={quantity === max ? "default" : "outline"}
                      onClick={() => setQty(max)}
                    >
                      Max ({formatNumber(max)})
                    </Button>
                  ) : null}
                </fieldset>

                <div className="rounded-md bg-muted/60 p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Gross amount
                    </span>
                    <span
                      className="text-2xl font-semibold text-ink tabular"
                      aria-live="polite"
                    >
                      {formatMoney(gross, currency)}
                    </span>
                  </div>
                  <p className="mt-1 text-right text-xs text-muted-foreground tabular">
                    {formatNumber(quantity)} × {formatMoney(price, currency)}
                    {entryFee === null
                      ? " · fees calculated at order placement"
                      : ""}
                  </p>
                  {entryFee !== null ? (
                    <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm tabular">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">
                          Entry fee ({formatPercent(entryFeeRate)})
                        </dt>
                        <dd className="text-ink">
                          {formatMoney(entryFee, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 font-semibold">
                        <dt className="text-ink">Estimated total</dt>
                        <dd className="text-ink">
                          {formatMoney(addDecimal(gross, entryFee), currency)}
                        </dd>
                      </div>
                      <p className="pt-1 text-right text-xs font-normal text-muted-foreground">
                        Final amount confirmed at order placement
                      </p>
                    </dl>
                  ) : null}
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button asChild variant="ghost">
                    <Link href={`/real-estate/${estate.id}`}>
                      <ArrowLeft /> Back to offering
                    </Link>
                  </Button>
                  <Button
                    onClick={toReview}
                    disabled={outOfRange}
                    className="bg-brand text-brand-foreground hover:bg-brand-light"
                  >
                    Review order <ArrowRight />
                  </Button>
                </div>
              </PanelBody>
            </Panel>
          ) : null}

          {step === "review" ? (
            <Panel>
              <PanelHeader
                title="Review your order"
                description="Check the details before placing the order. Shares are reserved once it is placed."
              />
              <PanelBody className="space-y-6">
                <KeyValueList
                  items={[
                    { label: "Offering", value: title },
                    {
                      label: "Token",
                      value: estate.token?.symbol ?? "—",
                    },
                    {
                      label: "Quantity",
                      value: `${formatNumber(quantity)} shares`,
                    },
                    {
                      label: "Unit price",
                      value: formatMoney(price, currency),
                    },
                    {
                      label: "Gross amount",
                      value: formatMoney(gross, currency),
                    },
                    ...(entryFee === null
                      ? [
                          {
                            label: "Fees",
                            value: (
                              <span className="text-muted-foreground">
                                Calculated at placement
                              </span>
                            ),
                          },
                        ]
                      : [
                          {
                            label: `Entry fee (${formatPercent(entryFeeRate)})`,
                            value: formatMoney(entryFee, currency),
                          },
                          {
                            label: "Estimated total",
                            value: (
                              <span className="font-semibold">
                                {formatMoney(
                                  addDecimal(gross, entryFee),
                                  currency,
                                )}
                              </span>
                            ),
                          },
                        ]),
                    { label: "Settlement", value: "Bank transfer" },
                  ]}
                />

                <fieldset className="space-y-3">
                  <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Acknowledgements
                  </legend>
                  <label
                    htmlFor="ack-risk"
                    className="flex cursor-pointer gap-3 rounded-md border border-border p-3 text-sm hover:bg-muted/40"
                  >
                    <Checkbox
                      id="ack-risk"
                      checked={ack.risk}
                      onCheckedChange={(v) =>
                        setAck((a) => ({ ...a, risk: v === true }))
                      }
                      className="mt-0.5"
                    />
                    <span>
                      I have read the risk disclosure. Real-estate securities
                      are illiquid, their value may go down as well as up and
                      the target yield is not guaranteed. I may lose all of the
                      capital invested.
                    </span>
                  </label>
                  <label
                    htmlFor="ack-terms"
                    className="flex cursor-pointer gap-3 rounded-md border border-border p-3 text-sm hover:bg-muted/40"
                  >
                    <Checkbox
                      id="ack-terms"
                      checked={ack.terms}
                      onCheckedChange={(v) =>
                        setAck((a) => ({ ...a, terms: v === true }))
                      }
                      className="mt-0.5"
                    />
                    <span>
                      I accept the subscription terms and understand that the
                      shares are reserved for a limited time and must be paid by
                      bank transfer before the reservation ends.
                    </span>
                  </label>
                </fieldset>

                {failure ? (
                  <div
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  >
                    <div className="font-semibold">{failure.title}</div>
                    <p className="mt-0.5">{failure.body}</p>
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setStep("amount")}
                    disabled={create.isPending}
                  >
                    <ArrowLeft /> Change amount
                  </Button>
                  <Button
                    onClick={submit}
                    disabled={!ack.risk || !ack.terms || create.isPending}
                    className="bg-brand text-brand-foreground hover:bg-brand-light"
                  >
                    {create.isPending ? <TookenLoader size={16} /> : null}
                    {create.isError ? "Retry order" : "Place order"}
                  </Button>
                </div>
              </PanelBody>
            </Panel>
          ) : null}

          {step === "done" && placed ? (
            <>
              <Panel>
                <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-ink">
                      Order placed
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Reference{" "}
                      <span className="font-mono text-ink">
                        {placed.orderRef}
                      </span>{" "}
                      · {formatNumber(placed.tokenQuantity)} shares reserved
                    </p>
                  </div>
                  <OrderStatusBadge code={placed.statusCode} />
                </PanelBody>
              </Panel>

              <ReservationCountdown expiresAt={placed.reservationExpiresAt} />

              <Panel>
                <PanelHeader title="Amount due" />
                <PanelBody>
                  <KeyValueList
                    items={[
                      {
                        label: "Gross amount",
                        value: formatMoney(
                          placed.grossAmount,
                          placed.currencyCode,
                        ),
                      },
                      ...(placed.fees ?? []).map((f) => ({
                        label: `${f.code === "ENTRY" ? "Entry fee" : f.code} (${formatPercent(f.rate)})`,
                        value: formatMoney(f.amount, placed.currencyCode),
                      })),
                    ]}
                  />
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-semibold text-ink">
                      Total to pay
                    </span>
                    <span className="text-xl font-semibold text-ink tabular">
                      {formatMoney(placed.amountDue, placed.currencyCode)}
                    </span>
                  </div>
                </PanelBody>
              </Panel>

              <SettlementInstructions
                amountDue={placed.amountDue}
                currency={placed.currencyCode}
                orderRef={placed.orderRef}
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button asChild variant="outline">
                  <Link href="/explore">Back to the marketplace</Link>
                </Button>
                <Button
                  asChild
                  className="bg-brand text-brand-foreground hover:bg-brand-light"
                >
                  <Link href={`/orders/${encodeURIComponent(placed.orderRef)}`}>
                    Track this order <ArrowRight />
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OfferingSummary estate={estate} remaining={remaining} />
        </aside>
      </div>
    </div>
  );
}

function OfferingSummary({
  estate,
  remaining,
}: {
  estate: RealEstate;
  remaining: number | null;
}) {
  const cfg = estate.configuration ?? {};
  const currency = cfg.currency_code || "EUR";
  const cover = estateCover(estate);
  const funded = fundingPercent(estate);
  return (
    <Panel className="overflow-hidden">
      <div className="relative aspect-[16/9] bg-ink">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 400px, 100vw"
            loading="eager"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Building2 className="size-10 text-white/25" aria-hidden />
          </div>
        )}
      </div>
      <PanelBody className="space-y-4">
        <div>
          <div className="font-semibold text-ink">{estate.title}</div>
          <div className="text-xs text-muted-foreground">
            {[estateLocation(estate), estate.issuer?.name]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        {funded !== null ? (
          <div className="space-y-1.5">
            <Progress value={funded} aria-label="Subscribed" />
            <div className="flex justify-between text-xs text-muted-foreground tabular">
              <span>{formatPercent(funded, 1)} subscribed</span>
              {remaining !== null ? (
                <span>{formatNumber(remaining)} shares left</span>
              ) : null}
            </div>
          </div>
        ) : null}
        <KeyValueList
          items={[
            {
              label: "Price per share",
              value: formatMoney(cfg.price_per_share, currency),
            },
            { label: "Target yield", value: formatPercent(cfg.yield) },
            {
              label: "Distributions",
              value: formatFrequency(
                cfg.payment_frequency,
                cfg.payment_frequency_type,
              ),
            },
            {
              label: "Max per investor",
              value: cfg.max_shares_per_investor
                ? `${formatNumber(cfg.max_shares_per_investor)} shares`
                : "—",
            },
            ...offeringTerms(cfg).filter((t) => t.label !== "Compartment"),
          ]}
        />
      </PanelBody>
    </Panel>
  );
}
