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
import { useEffect, useMemo, useRef, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ApiError, errorMessage, newIdempotencyKey } from "@/lib/api/client";
import {
  useCreateOrder,
  useOrder,
  useOrders,
  useRealEstate,
} from "@/lib/api/hooks";
import type { RealEstate } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import {
  addDecimal,
  compareDecimal,
  formatFrequency,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRecordedMoney,
  multiplyDecimal,
  percentOf,
  remainingShares,
} from "@/lib/format";
import { offeringTerms } from "@/lib/offering-terms";
import {
  clearLegacyOrderIntent,
  clearOrderIntent,
  type OrderIntent,
  readOrderIntent,
  saveOrderIntent,
} from "@/lib/order-intent";
import {
  budgetToShares,
  committedShares,
  investmentShareBounds,
  maxSubscribable,
} from "@/lib/portfolio";
import { canInvest } from "@/lib/status";
import { cn } from "@/lib/utils";
import { OrderPaymentSection } from "../../../_components/order-payment-section";

type Step = "amount" | "review" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "amount", label: "Amount" },
  { key: "review", label: "Review" },
  { key: "done", label: "Confirmation" },
];

const QUICK_PICKS = [1, 10, 25, 50, 100, 250];

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
  if (!estate.data) {
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
  if (!isInvestor) {
    return (
      <Blocking
        crumbs={crumbs}
        icon={Ban}
        title="Investor account required"
        description="Only investor accounts can place subscription orders."
      />
    );
  }
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
  if (orders.isLoading) return <PageSkeleton />;
  if (!orders.data) {
    return (
      <div>
        <PageHeader breadcrumbs={crumbs} title="Subscribe" />
        <Panel>
          <ErrorState
            title="Your existing orders could not be checked"
            error={orders.error}
            onRetry={() => orders.refetch()}
          />
        </Panel>
      </div>
    );
  }

  const cfg = e.configuration;
  let validOfferingData = false;
  try {
    validOfferingData =
      !!cfg?.price_per_share &&
      compareDecimal(cfg.price_per_share, "0") > 0 &&
      !!cfg.total_shares &&
      compareDecimal(cfg.total_shares, "0") > 0 &&
      /^[A-Z]{3}$/.test(cfg.currency_code ?? "") &&
      Number.isSafeInteger(e.progression?.tokens_sold) &&
      (e.progression?.tokens_sold ?? -1) >= 0;
  } catch {
    validOfferingData = false;
  }
  if (!validOfferingData) {
    return (
      <div>
        <PageHeader breadcrumbs={crumbs} title="Subscribe" />
        <Panel>
          <ErrorState
            title="Offering details are unavailable"
            error={
              new Error(
                "The price, currency or current share availability could not be verified.",
              )
            }
            onRetry={() => estate.refetch()}
          />
        </Panel>
      </div>
    );
  }

  return (
    <SubscriptionFlow
      key={`${user.id}-${e.id}`}
      estate={e}
      crumbs={crumbs}
      committed={committedShares(orders.data, estateId)}
      userId={user.id}
      detailsAvailable={!estate.isError && !orders.isError}
      retryDetails={() => {
        if (estate.isError) estate.refetch();
        if (orders.isError) orders.refetch();
      }}
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
  userId,
  detailsAvailable,
  retryDetails,
}: {
  estate: RealEstate;
  crumbs: { label: string; href?: string }[];
  committed: number;
  userId: number;
  detailsAvailable: boolean;
  retryDetails: () => void;
}) {
  const cfg = estate.configuration ?? {};
  const currency = cfg.currency_code || "EUR";
  const price = cfg.price_per_share ?? "0";
  const maxPerInvestor = Number.parseInt(cfg.max_shares_per_investor ?? "", 10);
  const remaining = Math.min(
    remainingShares(cfg.total_shares, estate.progression?.tokens_sold),
    Number.MAX_SAFE_INTEGER,
  );
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
  const [amountMode, setAmountMode] = useState<"shares" | "budget">("shares");
  const [quantity, setQuantity] = useState(minQty);
  const [raw, setRaw] = useState(String(minQty));
  const [rawBudget, setRawBudget] = useState("");
  const [ack, setAck] = useState({ risk: false, terms: false });
  const [intent, setIntent] = useState<OrderIntent | null>(null);
  const [legacyIntent, setLegacyIntent] = useState<OrderIntent | null>(null);
  const [legacyDiscardConfirmed, setLegacyDiscardConfirmed] = useState(false);
  const [storageState, setStorageState] = useState<
    "loading" | "ready" | "unavailable" | "invalid"
  >("loading");
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string>();
  const [checkedOrderRef, setCheckedOrderRef] = useState<string>();
  const stepHeadingRef = useRef<HTMLSpanElement>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<Step>("amount");
  const create = useCreateOrder();
  const orderQuery = useOrder(orderRef);

  const title = estate.title ?? `Offering #${estate.id}`;
  const pendingIntent = !!intent?.submitted && !intent.orderRef;
  const budget = useMemo(
    () => budgetToShares(rawBudget, price, max),
    [rawBudget, price, max],
  );
  const outOfRange =
    !Number.isSafeInteger(quantity) ||
    quantity < minQty ||
    quantity > max ||
    (amountMode === "budget" && !budget);
  const gross = useMemo(() => {
    if (!Number.isSafeInteger(quantity) || quantity < 1) return null;
    try {
      return multiplyDecimal(price, quantity);
    } catch {
      return null;
    }
  }, [price, quantity]);
  const entryFee = useMemo(() => {
    if (!entryFeeRate || gross === null) return null;
    try {
      return percentOf(gross, entryFeeRate);
    } catch {
      return null;
    }
  }, [gross, entryFeeRate]);

  useEffect(() => {
    const stored = readOrderIntent(userId, estate.id);
    setStorageState(stored.status);
    if (stored.status !== "ready") return;
    setIntent(stored.intent);
    setLegacyIntent(stored.legacy);
    if (stored.intent) {
      setQuantity(stored.intent.quantity);
      setRaw(String(stored.intent.quantity));
      if (stored.intent.orderRef) {
        setOrderRef(stored.intent.orderRef);
        setStep("done");
      }
    }
  }, [estate.id, userId]);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    if (step === "done") doneHeadingRef.current?.focus();
    else stepHeadingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!orderRef) return;
    let active = true;
    setCheckedOrderRef(undefined);
    void orderQuery.refetch().then((result) => {
      if (active && result.isSuccess) setCheckedOrderRef(orderRef);
    });
    return () => {
      active = false;
    };
  }, [orderRef, orderQuery.refetch]);

  useEffect(() => {
    if (step !== "amount" || amountMode !== "budget" || pendingIntent) return;
    const next = budget?.quantity ?? 0;
    setQuantity(next);
    setRaw(String(next));
  }, [amountMode, budget?.quantity, pendingIntent, step]);

  const setQty = (n: number) => {
    const v = Math.max(0, Math.floor(n));
    setQuantity(v);
    setRaw(String(v));
  };

  const toReview = () => {
    if (
      (outOfRange && !pendingIntent) ||
      (!detailsAvailable && !pendingIntent) ||
      legacyIntent
    ) {
      return;
    }
    const current =
      intent?.quantity === quantity
        ? intent
        : { quantity, key: newIdempotencyKey(), submitted: false };
    if (!saveOrderIntent(userId, estate.id, current)) {
      setStorageMessage(
        "Your request could not be saved in this browser. Enable session storage before continuing.",
      );
      return;
    }
    setStorageMessage(null);
    setIntent(current);
    setAck({ risk: false, terms: false });
    create.reset();
    setStep("review");
  };

  const submit = () => {
    if (
      !ack.risk ||
      !ack.terms ||
      create.isPending ||
      legacyIntent ||
      (!detailsAvailable && !pendingIntent)
    ) {
      return;
    }
    const current = intent ?? {
      quantity,
      key: newIdempotencyKey(),
      submitted: false,
    };
    const wasSubmitted = current.submitted;
    const submitted = { ...current, submitted: true };
    if (!saveOrderIntent(userId, estate.id, submitted)) {
      setStorageMessage(
        "Your request could not be saved in this browser. No order was submitted.",
      );
      return;
    }
    setStorageMessage(null);
    setIntent(submitted);
    create.mutate(
      {
        realEstateId: estate.id,
        quantity: current.quantity,
        idempotencyKey: current.key,
      },
      {
        onSuccess: (order) => {
          const completed = { ...submitted, orderRef: order.orderRef };
          if (!saveOrderIntent(userId, estate.id, completed)) {
            setStorageMessage(
              "The order was placed, but its reference could not be saved in this browser. Find it in My orders before starting another request.",
            );
          }
          setIntent(completed);
          setOrderRef(order.orderRef);
          setStep("done");
        },
        onError: (error) => {
          const status = error instanceof ApiError ? error.status : 0;
          if (
            !wasSubmitted &&
            [400, 403, 404, 409].includes(status) &&
            clearOrderIntent(userId, estate.id)
          ) {
            setIntent(null);
          }
        },
      },
    );
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const failure = create.isError ? describeError(create.error) : null;
  const placed =
    orderQuery.isError || checkedOrderRef !== orderRef
      ? undefined
      : orderQuery.data;

  const resumeLegacy = () => {
    if (!legacyIntent || intent?.submitted) return;
    if (!saveOrderIntent(userId, estate.id, legacyIntent)) {
      setStorageMessage(
        "The earlier request could not be saved to this account.",
      );
      return;
    }
    setIntent(legacyIntent);
    setQuantity(legacyIntent.quantity);
    setRaw(String(legacyIntent.quantity));
    setAmountMode("shares");
    if (legacyIntent.orderRef) {
      setOrderRef(legacyIntent.orderRef);
      setStep("done");
    }
    if (clearLegacyOrderIntent(estate.id)) {
      setLegacyIntent(null);
      setStorageMessage(null);
    } else {
      setStorageMessage(
        "The request was saved, but its unassigned browser record could not be removed.",
      );
    }
  };

  const discardLegacy = () => {
    if (!legacyDiscardConfirmed) return;
    if (!clearLegacyOrderIntent(estate.id)) {
      setStorageMessage("The unassigned browser request could not be removed.");
      return;
    }
    setLegacyIntent(null);
    setLegacyDiscardConfirmed(false);
    setStorageMessage(null);
  };

  const startAnother = () => {
    if (!clearOrderIntent(userId, estate.id)) {
      setStorageMessage(
        "The saved request could not be cleared in this browser.",
      );
      return;
    }
    setStorageMessage(null);
    setIntent(null);
    setOrderRef(undefined);
    setQty(minQty);
    setAmountMode("shares");
    setRawBudget("");
    setAck({ risk: false, terms: false });
    create.reset();
    setStep("amount");
  };

  if (storageState === "loading") return <PageSkeleton />;
  if (storageState !== "ready") {
    return (
      <Blocking
        crumbs={crumbs}
        icon={ShieldAlert}
        title="Saved request unavailable"
        description={
          storageState === "invalid"
            ? "A saved request could not be read safely. Check My orders before starting another subscription."
            : "Session storage is unavailable. It is needed to prevent duplicate order requests."
        }
        action={
          <Button asChild variant="outline">
            <Link href="/orders">View My orders</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={crumbs}
        eyebrow="Subscription"
        title={title}
        description="Subscribe to security tokens representing shares of this real-estate vehicle."
      />

      {storageMessage ? (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {storageMessage}
        </div>
      ) : null}

      {!detailsAvailable ? (
        <div
          role="alert"
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p>
            Current offering or order details could not be refreshed. Your
            entries are preserved; retry before starting a new request.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={retryDetails}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {legacyIntent ? (
        <section className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <h2 className="font-semibold">Earlier unassigned request</h2>
          <p className="mt-1">
            This browser has an earlier request for{" "}
            {formatNumber(legacyIntent.quantity)} shares, but its account is
            unknown. Check your orders first. If the request belongs to this
            account, resume it with its original key to avoid a duplicate.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/orders">View My orders</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resumeLegacy}
              disabled={!!intent?.submitted}
            >
              Resume my earlier request
            </Button>
          </div>
          {intent?.submitted ? (
            <p className="mt-2">
              Resolve the request already saved to this account before resuming
              another.
            </p>
          ) : null}
          <label
            htmlFor="discard-legacy"
            className="mt-4 flex items-start gap-2"
          >
            <Checkbox
              id="discard-legacy"
              checked={legacyDiscardConfirmed}
              onCheckedChange={(value) =>
                setLegacyDiscardConfirmed(value === true)
              }
            />
            <span>
              I have checked My orders and want to discard this unassigned
              browser request.
            </span>
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={discardLegacy}
            disabled={!legacyDiscardConfirmed}
          >
            Discard unassigned request
          </Button>
        </section>
      ) : null}

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
                i === stepIndex ? "inline" : "hidden sm:inline",
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
                title={
                  <span ref={stepHeadingRef} tabIndex={-1}>
                    Choose your subscription amount
                  </span>
                }
                description={`One share = ${formatMoney(price, currency)}. Whole shares only.`}
              />
              <PanelBody className="space-y-6">
                {pendingIntent ? (
                  <output className="block rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                    An earlier request for {formatNumber(quantity)} shares may
                    already have been placed. Check{" "}
                    <Link href="/orders" className="underline">
                      My orders
                    </Link>{" "}
                    or continue with the same request to retry safely.
                  </output>
                ) : null}
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
                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium text-ink/80">
                    Choose an amount by
                  </legend>
                  <RadioGroup
                    value={amountMode}
                    disabled={pendingIntent}
                    onValueChange={(value) => {
                      if (value === "budget") {
                        setAmountMode("budget");
                        setQty(budget?.quantity ?? 0);
                      } else {
                        setAmountMode("shares");
                        setQty(quantity >= minQty ? quantity : minQty);
                      }
                    }}
                    className="flex flex-wrap gap-x-6 gap-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="shares" id="amount-by-shares" />
                      <Label htmlFor="amount-by-shares">Shares</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="budget" id="amount-by-budget" />
                      <Label htmlFor="amount-by-budget">
                        Budget excluding fees
                      </Label>
                    </div>
                  </RadioGroup>
                </fieldset>

                {amountMode === "budget" ? (
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="text-xs font-medium">
                      Budget excluding fees ({currency})
                    </Label>
                    <Input
                      id="budget"
                      inputMode="decimal"
                      value={rawBudget}
                      maxLength={30}
                      onChange={(event) => {
                        const next = event.target.value;
                        setRawBudget(next);
                        setQty(budgetToShares(next, price, max)?.quantity ?? 0);
                      }}
                      className="h-10 max-w-56 text-lg font-semibold tabular"
                      aria-invalid={rawBudget !== "" && outOfRange}
                      aria-describedby="budget-hint"
                    />
                    <p
                      id="budget-hint"
                      className={cn(
                        "text-xs",
                        rawBudget !== "" && outOfRange
                          ? "text-red-600"
                          : "text-muted-foreground",
                      )}
                      aria-live="polite"
                    >
                      {budget
                        ? `${formatNumber(budget.quantity)} whole shares; ${formatMoney(budget.remainder, currency)} remains from this budget. Fees are additional.`
                        : "Enter an amount using a decimal point. Fees are additional."}
                      {budget && budget.quantity < minQty
                        ? ` The minimum is ${formatNumber(minQty)} share${minQty === 1 ? "" : "s"}.`
                        : ""}
                      {max >= minQty && max < Number.MAX_SAFE_INTEGER
                        ? ` Maximum available to you: ${formatNumber(max)} shares.`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <>
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
                          disabled={pendingIntent || quantity <= minQty}
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
                          disabled={pendingIntent}
                          className="h-10 max-w-40 text-center text-lg font-semibold tabular"
                          aria-invalid={outOfRange}
                          aria-describedby="quantity-hint"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-lg"
                          onClick={() => setQty(quantity + 1)}
                          disabled={pendingIntent || quantity >= max}
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
                            disabled={pendingIntent}
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
                          disabled={pendingIntent}
                        >
                          Max ({formatNumber(max)})
                        </Button>
                      ) : null}
                    </fieldset>
                  </>
                )}

                <div className="rounded-md bg-muted/60 p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Estimated total including fees
                    </span>
                    <span
                      className="text-2xl font-semibold text-ink tabular"
                      aria-live="polite"
                    >
                      {entryFee === null || gross === null
                        ? "To be confirmed"
                        : formatMoney(addDecimal(gross, entryFee), currency)}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm tabular">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">
                        Gross amount ({formatNumber(quantity)} ×{" "}
                        {formatMoney(price, currency)})
                      </dt>
                      <dd className="text-ink">
                        {formatMoney(gross, currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {entryFee === null
                          ? "Fees"
                          : `Entry fee (${formatPercent(entryFeeRate)})`}
                      </dt>
                      <dd className="text-ink">
                        {entryFee === null
                          ? "Calculated at placement"
                          : formatMoney(entryFee, currency)}
                      </dd>
                    </div>
                  </dl>
                  <p className="pt-2 text-right text-xs text-muted-foreground">
                    Final amount confirmed at order placement
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button asChild variant="ghost">
                    <Link href={`/real-estate/${estate.id}`}>
                      <ArrowLeft /> Back to offering
                    </Link>
                  </Button>
                  <Button
                    onClick={toReview}
                    disabled={
                      (outOfRange && !pendingIntent) ||
                      (!detailsAvailable && !pendingIntent) ||
                      !!legacyIntent
                    }
                    className="bg-brand text-brand-foreground hover:bg-brand-light"
                  >
                    {pendingIntent ? "Review saved request" : "Review order"}{" "}
                    <ArrowRight />
                  </Button>
                </div>
              </PanelBody>
            </Panel>
          ) : null}

          {step === "review" ? (
            <Panel>
              <PanelHeader
                title={
                  <span ref={stepHeadingRef} tabIndex={-1}>
                    Review your order
                  </span>
                }
                description="Placing the order reserves shares for a limited time. You will need to pay by bank transfer before the reservation ends."
              />
              <PanelBody className="space-y-6">
                {pendingIntent ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                    This request may already have been placed. Retrying uses the
                    same key; any existing order returned will contain its
                    confirmed amounts. You can also check{" "}
                    <Link href="/orders" className="underline">
                      My orders
                    </Link>
                    .
                  </div>
                ) : null}
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
                    ...(entryFee === null || gross === null
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
                  <p
                    id="subscription-documents-unavailable"
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                  >
                    The risk disclosure and subscription terms are not currently
                    available to review in this application.
                  </p>
                  <label
                    htmlFor="ack-risk"
                    className="flex cursor-pointer gap-3 rounded-md border border-border p-3 text-sm hover:bg-muted/40"
                  >
                    <Checkbox
                      id="ack-risk"
                      checked={ack.risk}
                      aria-describedby="subscription-documents-unavailable"
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
                      aria-describedby="subscription-documents-unavailable"
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
                    disabled={create.isPending || pendingIntent}
                  >
                    <ArrowLeft /> Change amount
                  </Button>
                  <Button
                    onClick={submit}
                    disabled={
                      !ack.risk ||
                      !ack.terms ||
                      create.isPending ||
                      (!detailsAvailable && !pendingIntent) ||
                      !!legacyIntent
                    }
                    className="bg-brand text-brand-foreground hover:bg-brand-light"
                  >
                    {create.isPending ? <TookenLoader size={16} /> : null}
                    {create.isError ? "Retry order" : "Place order"}
                  </Button>
                </div>
              </PanelBody>
            </Panel>
          ) : null}

          {step === "done" && orderRef ? (
            <>
              <Panel>
                <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      ref={doneHeadingRef}
                      tabIndex={-1}
                      className="text-lg font-semibold text-ink"
                    >
                      {orderQuery.isError
                        ? "Order saved — status unavailable"
                        : placed
                          ? "Order recorded"
                          : "Checking order status"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Reference{" "}
                      <span className="break-all font-mono text-ink">
                        {orderRef}
                      </span>
                      {placed
                        ? ` · ${formatNumber(placed.tokenQuantity)} shares`
                        : ""}
                    </p>
                  </div>
                  {placed ? (
                    <OrderStatusBadge code={placed.statusCode} />
                  ) : null}
                </PanelBody>
              </Panel>

              {orderQuery.isError ? (
                <Panel>
                  <ErrorState
                    title="Current order status could not be checked"
                    error={orderQuery.error}
                    onRetry={() => {
                      void orderQuery.refetch().then((result) => {
                        if (result.isSuccess) setCheckedOrderRef(orderRef);
                      });
                    }}
                  />
                </Panel>
              ) : placed ? (
                <>
                  <OrderPaymentSection order={placed} />

                  <Panel>
                    <PanelHeader title="Order total" />
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
                            value: formatRecordedMoney(
                              f.amount,
                              placed.currencyCode,
                            ),
                          })),
                        ]}
                      />
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                        <span className="text-sm font-semibold text-ink">
                          Total
                        </span>
                        <span className="text-xl font-semibold text-ink tabular">
                          {formatRecordedMoney(
                            placed.amountDue,
                            placed.currencyCode,
                          )}
                        </span>
                      </div>
                    </PanelBody>
                  </Panel>
                </>
              ) : (
                <output className="block text-sm text-muted-foreground">
                  Checking the current order status before showing payment
                  instructions.
                </output>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button asChild variant="outline">
                  <Link href="/explore">Back to the marketplace</Link>
                </Button>
                <Button type="button" variant="outline" onClick={startAnother}>
                  Start a separate subscription
                </Button>
                <Button
                  asChild
                  className="bg-brand text-brand-foreground hover:bg-brand-light"
                >
                  <Link href={`/orders/${encodeURIComponent(orderRef)}`}>
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
