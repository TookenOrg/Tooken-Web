"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { KeyValueList } from "@/components/app/key-value";
import { errorMessage } from "@/lib/api/client";
import { useConfirmPayment } from "@/lib/api/hooks";
import type { IssuanceOrder } from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/format";

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

  const run = () => {
    if (!order) return;
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
      open={open}
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
                    {formatMoney(order.amountDue, order.currencyCode)}
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
