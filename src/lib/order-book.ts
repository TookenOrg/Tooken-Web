import type { IssuanceOrder, KycVerification } from "@/lib/api/types";
import { addDecimal } from "@/lib/format";

/** Back-office views of the order book, grouped by what operations must do next. */
export type OrderBucket =
  | "awaiting"
  | "settlement"
  | "settled"
  | "exceptions"
  | "all";

export const ORDER_BUCKETS: {
  key: OrderBucket;
  label: string;
  description: string;
}[] = [
  {
    key: "awaiting",
    label: "Awaiting payment",
    description: "Reserved shares waiting for the investor's transfer.",
  },
  {
    key: "settlement",
    label: "In settlement",
    description: "Payment received, tokens being minted on-chain.",
  },
  {
    key: "settled",
    label: "Settled",
    description: "Tokens delivered and order closed.",
  },
  {
    key: "exceptions",
    label: "Exceptions",
    description: "Expired, cancelled, failed or reversed orders.",
  },
  { key: "all", label: "All", description: "Every order on the platform." },
];

const BUCKET_OF: Record<string, Exclude<OrderBucket, "all">> = {
  CREATED: "awaiting",
  AWAITING_PAYMENT: "awaiting",
  PAYMENT_CONFIRMED: "settlement",
  DELIVERY_IN_PROGRESS: "settlement",
  DELIVERED: "settlement",
  CLOSED: "settled",
};

/** Unknown or abnormal statuses fall into exceptions so they are never hidden. */
export function orderBucket(
  code: string | null | undefined,
): Exclude<OrderBucket, "all"> {
  return BUCKET_OF[code ?? ""] ?? "exceptions";
}

export function bucketCounts(
  orders: readonly Pick<IssuanceOrder, "statusCode">[],
): Record<OrderBucket, number> {
  const counts: Record<OrderBucket, number> = {
    awaiting: 0,
    settlement: 0,
    settled: 0,
    exceptions: 0,
    all: orders.length,
  };
  for (const o of orders) counts[orderBucket(o.statusCode)] += 1;
  return counts;
}

/** Identity of an investor as known from their KYC filings. */
export type InvestorInfo = {
  userId: number;
  fullName?: string;
  email?: string;
  countryCode?: string;
  kycId?: number;
  kycStatus?: string;
};

/** Indexes investors by user id; the most recent filing wins. */
export function investorDirectory(
  files: readonly KycVerification[] | undefined,
): Map<number, InvestorInfo> {
  const map = new Map<number, InvestorInfo>();
  const sorted = [...(files ?? [])].sort(
    (a, b) =>
      time(a.submitted_at ?? a.created_at) -
      time(b.submitted_at ?? b.created_at),
  );
  for (const f of sorted) {
    map.set(f.user_id, {
      userId: f.user_id,
      fullName: f.declared_full_name,
      email: f.email,
      countryCode: f.declared_country_code,
      kycId: f.id,
      kycStatus: f.status,
    });
  }
  return map;
}

function time(value: string | null | undefined): number {
  const t = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(t) ? 0 : t;
}

export type OrderFilter = {
  bucket?: OrderBucket;
  query?: string;
  /** Asset titles by id, to search on asset names missing from the order. */
  assetTitles?: ReadonlyMap<number, string>;
  investors?: ReadonlyMap<number, InvestorInfo>;
};

/** Filters by bucket and free text (reference, asset, investor id, name or e-mail). */
export function filterOrders<T extends IssuanceOrder>(
  orders: readonly T[],
  { bucket = "all", query = "", assetTitles, investors }: OrderFilter = {},
): T[] {
  const q = query.trim().toLowerCase();
  return orders.filter((o) => {
    if (bucket !== "all" && orderBucket(o.statusCode) !== bucket) return false;
    if (!q) return true;
    const investor = investors?.get(o.userId);
    const haystack = [
      o.orderRef,
      o.realEstateTitle,
      assetTitles?.get(o.realEstateId),
      String(o.userId),
      `#${o.userId}`,
      investor?.fullName,
      investor?.email,
    ];
    return haystack.some((v) => v?.toLowerCase().includes(q));
  });
}

/** Most recent first. */
export function sortOrders<T extends Pick<IssuanceOrder, "createdAt">>(
  orders: readonly T[],
): T[] {
  return [...orders].sort((a, b) => time(b.createdAt) - time(a.createdAt));
}

export type CurrencyTotal = { currency: string; amount: string };

/**
 * Sums `amountDue` per currency with exact decimal arithmetic. Malformed
 * amounts are skipped rather than silently turning the total into NaN.
 */
export function totalsByCurrency(
  orders: readonly Pick<IssuanceOrder, "amountDue" | "currencyCode">[],
): CurrencyTotal[] {
  const sums = new Map<string, string>();
  for (const o of orders) {
    const currency = o.currencyCode || "EUR";
    try {
      sums.set(currency, addDecimal(sums.get(currency) ?? "0", o.amountDue));
    } catch {
      // Ignored: an unparsable amount cannot be added exactly.
    }
  }
  return [...sums.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/** True when an unpaid order's reservation has lapsed but the backend has not expired it yet. */
export function isReservationLapsed(
  order: Pick<IssuanceOrder, "statusCode" | "reservationExpiresAt">,
  now = Date.now(),
): boolean {
  if (orderBucket(order.statusCode) !== "awaiting") return false;
  const t = time(order.reservationExpiresAt);
  return t > 0 && t <= now;
}
