"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useNow } from "@/app/(investor)/_components/use-now";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { KeyValueList } from "@/components/app/key-value";
import { errorMessage } from "@/lib/api/client";
import { useConfirmPayment } from "@/lib/api/hooks";
import type { IssuanceOrder } from "@/lib/api/types";
import { formatNumber, formatRecordedMoney } from "@/lib/format";
import { hasPaymentCurrency, reservationDeadlineState } from "@/lib/order-book";

/**
 * Records that the investor's transfer was received. The backend takes no
 * amount: the payment is deemed to match the order's amount due exactly.
 */
export function ConfirmPaymentDialog({
  order,
  investorLabel,
  open,
  onOpenChange,
  onConfirmed,
}: {
  order: IssuanceOrder | null;
  investorLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: (order: IssuanceOrder) => void;
}) {
  const confirm = useConfirmPayment();
  const now = useNow(1000, open);
  const available =
    !!order &&
    order.statusCode === "AWAITING_PAYMENT" &&
    hasPaymentCurrency(order) &&
    reservationDeadlineState(order.reservationExpiresAt, now) === "active";

  useEffect(() => {
    if (open && !available && !confirm.isPending) {
      onOpenChange(false);
      toast.error("Payment confirmation unavailable", {
        description:
          "The order status, reservation deadline or currency could not be verified.",
      });
    }
  }, [open, available, confirm.isPending, onOpenChange]);

  const run = () => {
    if (
      !order ||
      order.statusCode !== "AWAITING_PAYMENT" ||
      !hasPaymentCurrency(order) ||
      reservationDeadlineState(order.reservationExpiresAt) !== "active"
    ) {
      onOpenChange(false);
      toast.error("Payment confirmation unavailable", {
        description: "Refresh the order before trying again.",
      });
      return;
    }
    confirm.mutate(order.orderRef, {
      onSuccess: (updated) => {
        toast.success("Payment confirmed", {
          description: `${updated.orderRef} moves to on-chain settlement.`,
        });
        onOpenChange(false);
        onConfirmed?.(updated);
      },
      onError: (err) =>
        toast.error("Payment could not be confirmed", {
          description: errorMessage(err),
        }),
    });
  };

  return (
    <ConfirmDialog
      open={open && available}
      onOpenChange={onOpenChange}
      title="Confirm payment received"
      description={
        <p>
          Confirm only once the transfer is credited on the settlement account.
          Tokens are then minted to the investor&apos;s wallet. This cannot be
          undone.
        </p>
      }
      confirmLabel="Confirm payment"
      pending={confirm.isPending}
      onConfirm={run}
    >
      {order ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-1">
          <KeyValueList
            items={[
              {
                label: "Order reference",
                value: order.orderRef,
                mono: true,
              },
              ...(investorLabel
                ? [{ label: "Investor", value: investorLabel }]
                : []),
              {
                label: "Asset",
                value: order.realEstateTitle ?? `#${order.realEstateId}`,
              },
              {
                label: "Quantity",
                value: `${formatNumber(order.tokenQuantity)} tokens`,
              },
              {
                label: "Amount received",
                value: (
                  <span className="text-base font-semibold">
                    {formatRecordedMoney(order.amountDue, order.currencyCode)}
                  </span>
                ),
                hint: "Must equal the amount due",
              },
            ]}
          />
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
