import type { IssuanceOrder } from "@/lib/api/types";
import { isOrderSettled } from "@/lib/status";

/** Orders whose shares went back to the stock. */
const RELEASED = new Set(["CANCELLED", "EXPIRED", "REFUNDED"]);

export type SubscriptionFill = {
  /** Shares held by live orders (reserved or settled). */
  subscribed: bigint;
  settled: bigint;
  reserved: bigint;
  /** subscribed / total, as a percentage string with 2 decimals. */
  percent: string;
  orderCount: number;
};

/** Exact subscription progress of an asset from its orders. */
export function subscriptionFill(
  orders: IssuanceOrder[],
  totalShares: string | null | undefined,
): SubscriptionFill {
  let settled = 0n;
  let reserved = 0n;
  let orderCount = 0;
  for (const o of orders) {
    if (RELEASED.has(o.statusCode)) continue;
    orderCount++;
    const qty = BigInt(Math.max(0, Math.trunc(o.tokenQuantity ?? 0)));
    if (isOrderSettled(o.statusCode)) settled += qty;
    else reserved += qty;
  }
  const subscribed = settled + reserved;
  let total = 0n;
  try {
    total = BigInt((totalShares ?? "0").split(".")[0] || "0");
  } catch {
    total = 0n;
  }
  let percent = "0.00";
  if (total > 0n) {
    const bp = (subscribed * 10000n) / total;
    percent = `${bp / 100n}.${(bp % 100n).toString().padStart(2, "0")}`;
  }
  return { subscribed, settled, reserved, percent, orderCount };
}
