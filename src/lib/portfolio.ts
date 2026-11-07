/**
 * Investor portfolio aggregation, derived from the order book. Amounts stay
 * decimal strings and are summed exactly (BigInt), never as floats.
 */

import type { IssuanceOrder } from "@/lib/api/types";
import { addDecimal, multiplyDecimal, parseDecimal } from "@/lib/format";
import { hasPaymentCurrency } from "@/lib/order-book";
import { isOrderSettled } from "@/lib/status";

/** Orders still waiting on payment or delivery (shares are reserved). */
const PENDING: ReadonlySet<string> = new Set([
  "CREATED",
  "AWAITING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "DELIVERY_IN_PROGRESS",
]);

export function isOrderPending(code: string | null | undefined): boolean {
  return !!code && PENDING.has(code);
}

export type OrderCategory = "in_progress" | "settled" | "other";

export function orderCategory(code: string | null | undefined): OrderCategory {
  if (isOrderPending(code)) return "in_progress";
  if (isOrderSettled(code)) return "settled";
  return "other";
}

export type Holding = {
  realEstateId: number;
  title: string;
  currency: string;
  shares: number;
  /** Gross amount paid for the shares, fees excluded. */
  invested: string | null;
  /** Weighted average unit price, 2 decimals. */
  averagePrice: string | null;
  orders: number;
  lastOrderAt: string;
};

export type PortfolioSummary = {
  /** Gross invested capital of settled orders, per currency. */
  invested: Record<string, string | null>;
  holdings: Holding[];
  sharesHeld: number;
  pendingCount: number;
  /** Amount due (fees included) of pending orders, per currency. */
  pendingAmount: Record<string, string | null>;
};

/** `a / b` rounded half-up to `scale` decimals; "0.00" when b is zero. */
export function divideDecimal(
  a: string | number,
  b: string | number,
  scale = 2,
): string {
  const x = parseDecimal(a);
  const y = parseDecimal(b);
  if (y.int === 0n) return (0).toFixed(scale);
  // x.int / 10^xs ÷ y.int / 10^ys = x.int * 10^(ys + scale) / (y.int * 10^xs)
  const num = x.int * 10n ** BigInt(y.scale + scale);
  const den = y.int * 10n ** BigInt(x.scale);
  const negative = num < 0n !== den < 0n;
  const n = num < 0n ? -num : num;
  const d = den < 0n ? -den : den;
  const q = (n * 2n + d) / (2n * d);
  const digits = q.toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const frac = scale ? `.${digits.slice(-scale)}` : "";
  return `${negative && q !== 0n ? "-" : ""}${whole}${frac}`;
}

function addTo(
  map: Record<string, string | null>,
  currency: string,
  amount: string,
) {
  map[currency] = addDecimal(map[currency] ?? "0", amount || "0");
}

export function summarizePortfolio(
  orders: IssuanceOrder[],
  titles: Record<number, string | undefined> = {},
): PortfolioSummary {
  const invested: Record<string, string | null> = {};
  const pendingAmount: Record<string, string | null> = {};
  const byEstate = new Map<string, Holding & { cost8: string | null }>();
  let sharesHeld = 0;
  let pendingCount = 0;

  for (const o of orders) {
    const knownCurrency = hasPaymentCurrency(o)
      ? o.currencyCode.trim()
      : undefined;
    const currency = knownCurrency || "Currency unavailable";
    if (isOrderPending(o.statusCode)) {
      pendingCount += 1;
      if (knownCurrency) addTo(pendingAmount, currency, o.amountDue);
      else pendingAmount[currency] = null;
      continue;
    }
    if (!isOrderSettled(o.statusCode)) continue;

    if (knownCurrency) addTo(invested, currency, o.grossAmount);
    else invested[currency] = null;
    sharesHeld += o.tokenQuantity;
    const cost = knownCurrency
      ? multiplyDecimal(o.unitPrice || "0", o.tokenQuantity, 8)
      : null;
    const holdingKey = `${o.realEstateId}:${currency}`;
    const prev = byEstate.get(holdingKey);
    if (prev) {
      prev.shares += o.tokenQuantity;
      if (prev.invested !== null && prev.cost8 !== null && cost !== null) {
        prev.invested = addDecimal(prev.invested, o.grossAmount || "0");
        prev.cost8 = addDecimal(prev.cost8, cost, 8);
      }
      prev.orders += 1;
      if (o.createdAt > prev.lastOrderAt) prev.lastOrderAt = o.createdAt;
    } else {
      byEstate.set(holdingKey, {
        realEstateId: o.realEstateId,
        title:
          titles[o.realEstateId] ??
          o.realEstateTitle ??
          `Offering #${o.realEstateId}`,
        currency,
        shares: o.tokenQuantity,
        invested: knownCurrency ? addDecimal("0", o.grossAmount || "0") : null,
        averagePrice: knownCurrency ? "0.00" : null,
        orders: 1,
        lastOrderAt: o.createdAt,
        cost8: cost,
      });
    }
  }

  const holdings = Array.from(byEstate.values())
    .map(({ cost8, ...h }) => ({
      ...h,
      averagePrice: cost8 === null ? null : divideDecimal(cost8, h.shares),
    }))
    .sort(
      (a, b) =>
        a.title.localeCompare(b.title) || a.currency.localeCompare(b.currency),
    );

  return { invested, holdings, sharesHeld, pendingCount, pendingAmount };
}

/** Shares already committed (pending or settled) by the investor on one offering. */
export function committedShares(
  orders: IssuanceOrder[] | undefined,
  realEstateId: number,
): number {
  if (!orders) return 0;
  return orders
    .filter(
      (o) =>
        o.realEstateId === realEstateId &&
        (isOrderPending(o.statusCode) || isOrderSettled(o.statusCode)),
    )
    .reduce((sum, o) => sum + o.tokenQuantity, 0);
}

/** Largest quantity the investor may still subscribe; 0 when none. */
export function maxSubscribable({
  maxPerInvestor,
  remaining,
  committed = 0,
}: {
  maxPerInvestor?: number | null;
  remaining?: number | null;
  committed?: number;
}): number {
  const caps: number[] = [];
  if (maxPerInvestor && maxPerInvestor > 0) {
    caps.push(maxPerInvestor - committed);
  }
  if (typeof remaining === "number") caps.push(remaining);
  if (!caps.length) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.min(...caps));
}

/**
 * Whole shares from a budget excluding fees; the remainder retains the greater
 * input precision. Negative-signed budgets, including negative zero, are invalid.
 */
export function budgetToShares(
  budget: string,
  unitPrice: string,
  maxQuantity: number,
): { quantity: number; remainder: string } | null {
  if (
    typeof budget !== "string" ||
    typeof unitPrice !== "string" ||
    !Number.isSafeInteger(maxQuantity) ||
    maxQuantity < 0
  ) {
    return null;
  }

  const trimmedBudget = budget.trim();
  if (trimmedBudget.startsWith("-")) return null;

  let amount: ReturnType<typeof parseDecimal>;
  let price: ReturnType<typeof parseDecimal>;
  try {
    amount = parseDecimal(trimmedBudget);
    price = parseDecimal(unitPrice);
  } catch {
    return null;
  }
  if (price.int <= 0n) return null;

  const scale = Math.max(amount.scale, price.scale);
  const amountInt = amount.int * 10n ** BigInt(scale - amount.scale);
  const priceInt = price.int * 10n ** BigInt(scale - price.scale);
  const affordable = amountInt / priceInt;
  const cap = BigInt(maxQuantity);
  const quantity = affordable > cap ? cap : affordable;
  const digits = (amountInt - quantity * priceInt)
    .toString()
    .padStart(scale + 1, "0");
  const remainder =
    scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return { quantity: Number(quantity), remainder };
}

/**
 * Share-count bounds implied by the offering's investment amounts: the fewest
 * shares reaching `minInvestment` and the most staying within `maxInvestment`.
 * Bounds that cannot be computed are ignored.
 */
export function investmentShareBounds({
  price,
  minInvestment,
  maxInvestment,
}: {
  price: string | null | undefined;
  minInvestment?: string | null;
  maxInvestment?: string | null;
}): { min: number; max: number | null } {
  const bounds = { min: 1, max: null as number | null };
  let p: ReturnType<typeof parseDecimal>;
  try {
    p = parseDecimal(price ?? "");
  } catch {
    return bounds;
  }
  if (p.int <= 0n) return bounds;
  // amount / price as an exact fraction of two integers on a common scale.
  const ratio = (amount: string | null | undefined) => {
    if (!amount?.trim()) return null;
    try {
      const a = parseDecimal(amount);
      const scale = Math.max(a.scale, p.scale);
      const num = a.int * 10n ** BigInt(scale - a.scale);
      const den = p.int * 10n ** BigInt(scale - p.scale);
      return num >= 0n ? { num, den } : null;
    } catch {
      return null;
    }
  };
  const lo = ratio(minInvestment);
  if (lo) {
    const ceil = (lo.num + lo.den - 1n) / lo.den;
    bounds.min = Math.max(1, Number(ceil));
  }
  const hi = ratio(maxInvestment);
  if (hi) bounds.max = Number(hi.num / hi.den);
  return bounds;
}

/** "mm:ss" (or "h:mm:ss") left until `until`; "00:00" when elapsed. */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** First name for greetings, from a full name. */
export function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}
