import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { IssuanceOrder } from "@/lib/api/types";
import OrdersPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const order: IssuanceOrder = {
  userId: 1,
  orderRef: "ORDER-123",
  realEstateTitle: "Harbour House",
  tokenQuantity: 2,
  realEstateId: 1,
  statusCode: "AWAITING_PAYMENT",
  unitPrice: "100.00",
  currencyCode: "CHF",
  grossAmount: "200.00",
  amountDue: "202.00",
  feeAmount: "2.00",
  fees: [],
  reservationExpiresAt: "2099-01-01T10:15:00Z",
  createdAt: "2026-01-01T09:00:00Z",
  updatedAt: "2026-01-01T09:00:00Z",
};

vi.mock("@/lib/api/hooks", () => ({
  useOrders: () => ({ data: [order], refetch: vi.fn() }),
  useRealEstates: () => ({ isError: true }),
}));

it("searches the order's fallback offering title when the catalogue is unavailable", () => {
  render(<OrdersPage />);
  fireEvent.change(
    screen.getByRole("searchbox", { name: /reference or offering/i }),
    { target: { value: "hArBoUr" } },
  );
  expect(screen.getAllByText("Harbour House").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Payment details/).length).toBeGreaterThan(0);
  fireEvent.change(
    screen.getByRole("searchbox", { name: /reference or offering/i }),
    { target: { value: "nothing" } },
  );
  expect(screen.getByText("No matching orders")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getAllByText("Harbour House").length).toBeGreaterThan(0);
});
