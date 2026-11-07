"use client";

import type { IssuanceOrder } from "@/lib/api/types";
import { hasPaymentCurrency, reservationDeadlineState } from "@/lib/order-book";
import { ReservationCountdown } from "./reservation-countdown";
import { SettlementInstructions } from "./settlement-instructions";
import { useNow } from "./use-now";

export function OrderPaymentSection({ order }: { order: IssuanceOrder }) {
  const awaiting = order.statusCode === "AWAITING_PAYMENT";
  const now = useNow(1000, awaiting);
  if (!awaiting) return null;

  const deadline = reservationDeadlineState(order.reservationExpiresAt, now);
  if (deadline !== "active") {
    return (
      <output className="block rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {deadline === "lapsed"
          ? "The reservation has ended. Do not send a transfer while the order status is being updated."
          : "The reservation deadline is unavailable. Do not send a transfer until the order status can be confirmed."}
      </output>
    );
  }

  if (!hasPaymentCurrency(order)) {
    return (
      <output className="block rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        The payment currency is unavailable. Do not send a transfer until the
        order details can be confirmed.
      </output>
    );
  }

  return (
    <>
      <ReservationCountdown expiresAt={order.reservationExpiresAt} />
      <SettlementInstructions
        amountDue={order.amountDue}
        currency={order.currencyCode}
        orderRef={order.orderRef}
      />
    </>
  );
}
