import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { IssuanceOrder } from "@/lib/api/types";
import { ConfirmPaymentDialog } from "./confirm-payment-dialog";

const state = vi.hoisted(() => ({
  now: Date.parse("2026-01-01T10:00:00Z"),
  mutate: vi.fn(),
  close: vi.fn(),
}));

vi.mock("@/app/(investor)/_components/use-now", () => ({
  useNow: () => state.now,
}));
vi.mock("@/lib/api/hooks", () => ({
  useConfirmPayment: () => ({ mutate: state.mutate, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/app/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => void;
  }) =>
    open ? (
      <button type="button" onClick={onConfirm}>
        Confirm payment
      </button>
    ) : null,
}));

const order: IssuanceOrder = {
  userId: 1,
  orderRef: "TEST-123",
  tokenQuantity: 1,
  realEstateId: 1,
  statusCode: "AWAITING_PAYMENT",
  unitPrice: "100.00",
  currencyCode: "EUR",
  grossAmount: "100.00",
  amountDue: "100.00",
  feeAmount: "0.00",
  fees: [],
  reservationExpiresAt: "2026-01-01T10:15:00Z",
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T10:00:00Z",
};

afterEach(() => {
  vi.restoreAllMocks();
  state.mutate.mockClear();
  state.close.mockClear();
});

it("rechecks the deadline at the moment of confirmation", () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse(order.reservationExpiresAt));
  render(
    <ConfirmPaymentDialog order={order} open onOpenChange={state.close} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm payment" }));
  expect(state.mutate).not.toHaveBeenCalled();
  expect(state.close).toHaveBeenCalledWith(false);
});

it("closes confirmation when the server reports payment already recorded", () => {
  const { rerender } = render(
    <ConfirmPaymentDialog order={order} open onOpenChange={state.close} />,
  );
  rerender(
    <ConfirmPaymentDialog
      order={{ ...order, statusCode: "PAYMENT_CONFIRMED" }}
      open
      onOpenChange={state.close}
    />,
  );
  expect(screen.queryByRole("button", { name: "Confirm payment" })).toBeNull();
  expect(state.mutate).not.toHaveBeenCalled();
  expect(state.close).toHaveBeenCalledWith(false);
});

it("does not confirm a payment whose currency cannot be checked", () => {
  render(
    <ConfirmPaymentDialog
      order={{ ...order, currencyCode: "" }}
      open
      onOpenChange={state.close}
    />,
  );
  expect(screen.queryByRole("button", { name: "Confirm payment" })).toBeNull();
  expect(state.mutate).not.toHaveBeenCalled();
  expect(state.close).toHaveBeenCalledWith(false);
});
