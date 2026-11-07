import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { IssuanceOrder } from "@/lib/api/types";
import DashboardPage from "./page";

const state = vi.hoisted(() => ({
  orders: [] as IssuanceOrder[],
  orderError: false,
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({
    user: { full_name: "Test Investor", kyc_status: "verified" },
    isInvestor: true,
    refreshUser: vi.fn(),
  }),
}));
vi.mock("@/lib/api/hooks", () => ({
  useOrders: () => ({
    data: state.orderError ? undefined : state.orders,
    isError: state.orderError,
    error: new Error("Orders unavailable"),
    refetch: vi.fn(),
  }),
  useRealEstates: () => ({ data: [] }),
  useMyKycOnChain: () => ({ data: { is_verified: true } }),
}));
vi.mock("../_components/use-now", () => ({
  useNow: () => Date.parse("2026-01-01T10:00:00Z"),
}));

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
  createdAt: "2026-01-01T09:00:00Z",
  updatedAt: "2026-01-01T09:00:00Z",
};

beforeEach(() => {
  state.orderError = false;
  state.orders = [];
});

it("shows unpaid and lapsed orders without asking for payment twice", () => {
  state.orders = [
    order,
    { ...order, orderRef: "PAID", statusCode: "PAYMENT_CONFIRMED" },
    {
      ...order,
      orderRef: "LAPSED",
      reservationExpiresAt: "2026-01-01T09:59:00Z",
    },
  ];
  render(<DashboardPage />);
  expect(screen.getByText(/Payment required/)).toBeInTheDocument();
  expect(screen.getByText("Reservation ended")).toBeInTheDocument();
  expect(screen.getAllByText(/Payment required/)).toHaveLength(1);
});

it("does not present an orders API failure as an empty portfolio", () => {
  state.orderError = true;
  render(<DashboardPage />);
  expect(
    screen.getByText("Order actions are unavailable."),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Unavailable")).toHaveLength(4);
  expect(screen.queryByText("No holdings yet")).toBeNull();
});

it("counts an offering once while showing its currencies separately", () => {
  state.orders = [
    { ...order, statusCode: "CLOSED", currencyCode: "EUR" },
    {
      ...order,
      orderRef: "CHF-ORDER",
      statusCode: "CLOSED",
      currencyCode: "CHF",
    },
  ];
  render(<DashboardPage />);
  expect(screen.getByText("Offering held").parentElement).toHaveTextContent(
    "1",
  );
  expect(screen.getAllByText(/CHF\s/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/€/).length).toBeGreaterThan(0);
});

it("does not display a total or euros for holdings with unknown currency", () => {
  state.orders = [
    { ...order, statusCode: "CLOSED", currencyCode: "" },
    {
      ...order,
      orderRef: "UNKNOWN-SECOND",
      statusCode: "CLOSED",
      currencyCode: "",
      grossAmount: "400.00",
    },
  ];
  render(<DashboardPage />);
  expect(screen.getAllByText("Currency unavailable").length).toBeGreaterThan(0);
  expect(screen.queryByText(/€600/)).toBeNull();
});
