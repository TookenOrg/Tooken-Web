import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { IssuanceOrder } from "@/lib/api/types";
import { OrderPaymentSection } from "./order-payment-section";

const clock = vi.hoisted(() => ({ now: Date.parse("2026-01-01T10:00:00Z") }));

vi.mock("./use-now", () => ({ useNow: () => clock.now }));

const order: IssuanceOrder = {
  userId: 1,
  orderRef: "TEST-123",
  tokenQuantity: 2,
  realEstateId: 1,
  statusCode: "AWAITING_PAYMENT",
  unitPrice: "100.00",
  currencyCode: "EUR",
  grossAmount: "200.00",
  amountDue: "202.00",
  feeAmount: "2.00",
  fees: [],
  reservationExpiresAt: "2026-01-01T10:15:00Z",
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T10:00:00Z",
};

function paymentSection(current: IssuanceOrder) {
  return (
    <TooltipProvider>
      <OrderPaymentSection order={current} />
    </TooltipProvider>
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  clock.now = Date.parse("2026-01-01T10:00:00Z");
});

describe("OrderPaymentSection", () => {
  it("shows the amount but not illustrative bank details outside demo mode", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    render(paymentSection(order));
    expect(screen.getByText("€202.00")).toBeInTheDocument();
    expect(
      screen.getByText(/Bank details are unavailable/),
    ).toBeInTheDocument();
    expect(screen.queryByText("IBAN")).not.toBeInTheDocument();
  });

  it("removes payment instructions as soon as the reservation ends", () => {
    const { rerender } = render(paymentSection(order));
    expect(screen.getByText("Settlement instructions")).toBeInTheDocument();
    clock.now = Date.parse(order.reservationExpiresAt);
    rerender(paymentSection(order));
    expect(
      screen.queryByText("Settlement instructions"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Do not send a transfer/)).toBeInTheDocument();
  });

  it("does not show payment instructions for a confirmed or unknown deadline", () => {
    const { rerender } = render(
      paymentSection({ ...order, reservationExpiresAt: "invalid" }),
    );
    expect(screen.getByText(/deadline is unavailable/)).toBeInTheDocument();
    rerender(paymentSection({ ...order, statusCode: "PAYMENT_CONFIRMED" }));
    expect(
      screen.queryByText("Settlement instructions"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Do not send a transfer/),
    ).not.toBeInTheDocument();
  });

  it("does not show payment instructions when the currency is unavailable", () => {
    render(paymentSection({ ...order, currencyCode: "" }));
    expect(screen.getByText(/payment currency is unavailable/i)).toBeVisible();
    expect(screen.queryByText("Settlement instructions")).toBeNull();
  });
});
