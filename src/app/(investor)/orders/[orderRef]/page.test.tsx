import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { IssuanceOrder, RealEstate } from "@/lib/api/types";
import OrderDetailPage from "./page";

const clock = vi.hoisted(() => ({ now: Date.parse("2026-01-01T10:00:00Z") }));
const state = vi.hoisted(() => ({
  order: {
    data: undefined as IssuanceOrder | undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  estate: {
    data: undefined as RealEstate | undefined,
    isLoading: false,
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ orderRef: "ORD-1001" }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useOrder: () => state.order,
  useRealEstate: () => state.estate,
}));

vi.mock("../../_components/use-now", () => ({ useNow: () => clock.now }));

const baseOrder: IssuanceOrder = {
  userId: 1,
  orderRef: "ORD-1001",
  tokenQuantity: 5,
  realEstateId: 42,
  realEstateTitle: "Villa Aurora",
  statusCode: "DELIVERED",
  unitPrice: "100.00",
  currencyCode: "EUR",
  grossAmount: "500.00",
  amountDue: "505.00",
  feeAmount: "5.00",
  fees: [
    {
      code: "ENTRY",
      rate: "1",
      baseAmount: "500.00",
      amount: "5.00",
    },
  ],
  deliveryTxHash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  reservationExpiresAt: "2026-01-01T10:15:00Z",
  createdAt: "2026-01-01T09:50:00Z",
  updatedAt: "2026-01-01T10:05:00Z",
};

const baseEstate: RealEstate = {
  id: 42,
  title: "Villa Aurora",
  status: "fundraising",
  imageurl: "/villa-aurora.jpg",
  location: { city: "Paris" },
  token: {
    address: "0x1111111111111111111111111111111111111111",
    symbol: "AUR",
  },
  configuration: {
    price_per_share: "100.00",
    currency_code: "EUR",
    yield: 6.5,
  },
};

function renderPage() {
  return render(
    <TooltipProvider>
      <OrderDetailPage />
    </TooltipProvider>,
  );
}

describe("OrderDetailPage balanced layout", () => {
  beforeEach(() => {
    clock.now = Date.parse("2026-01-01T10:00:00Z");
    state.order.data = { ...baseOrder };
    state.order.isLoading = false;
    state.order.isError = false;
    state.estate.data = { ...baseEstate };
    state.estate.isLoading = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pairs Amount breakdown with On-chain delivery on the left and Offering with Record on the right", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Order progress" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your shares have been delivered."),
    ).toBeInTheDocument();

    const amountHeading = screen.getByRole("heading", {
      name: "Amount breakdown",
    });
    const leftColumn = amountHeading.closest(".lg\\:col-span-7");
    expect(leftColumn).not.toBeNull();
    expect(
      within(leftColumn as HTMLElement).getByRole("heading", {
        name: "On-chain delivery",
      }),
    ).toBeInTheDocument();
    expect(
      within(leftColumn as HTMLElement).getByRole("link", {
        name: "0xaaaaaa…aaaaaa",
      }),
    ).toHaveAttribute(
      "href",
      `https://sepolia.etherscan.io/tx/${baseOrder.deliveryTxHash}`,
    );
    expect(
      within(leftColumn as HTMLElement).getByRole("link", {
        name: "0x111111…111111",
      }),
    ).toHaveAttribute(
      "href",
      `https://sepolia.etherscan.io/address/${baseEstate.token?.address}`,
    );

    const offeringHeading = screen.getByRole("heading", { name: "Offering" });
    const rightColumn = offeringHeading.closest(".lg\\:col-span-5");
    expect(rightColumn).not.toBeNull();
    expect(
      within(rightColumn as HTMLElement).getByRole("heading", {
        name: "Record",
      }),
    ).toBeInTheDocument();
    expect(
      within(rightColumn as HTMLElement).getByAltText("Villa Aurora"),
    ).toBeInTheDocument();
  });

  it("warns about missing currency or lapsed reservations when awaiting payment", () => {
    state.order.data = {
      ...baseOrder,
      statusCode: "AWAITING_PAYMENT",
      currencyCode: "",
    };
    const { rerender } = renderPage();
    expect(
      screen.getAllByText(/payment currency is unavailable/i).length,
    ).toBeGreaterThan(0);

    clock.now = Date.parse("2026-01-01T10:20:00Z");
    state.order.data = {
      ...baseOrder,
      statusCode: "AWAITING_PAYMENT",
      currencyCode: "EUR",
    };
    rerender(
      <TooltipProvider>
        <OrderDetailPage />
      </TooltipProvider>,
    );
    expect(
      screen.getAllByText(/The reservation has ended\./).length,
    ).toBeGreaterThan(0);
  });

  it("shows a single alert message without header duplication when delivery fails", () => {
    state.order.data = {
      ...baseOrder,
      statusCode: "DELIVERY_FAILED",
    };
    renderPage();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("On-chain delivery failed.");
    expect(screen.getAllByText("On-chain delivery failed.")).toHaveLength(1);
  });
});
