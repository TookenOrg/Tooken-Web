import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/client";
import type { IssuanceOrder } from "@/lib/api/types";
import { saveOrderIntent } from "@/lib/order-intent";
import BuyPage from "./page";

const state = vi.hoisted(() => ({
  ordersError: false,
  staleOrders: false,
  orderError: false,
  mutationError: false,
  failNext: false,
  failureStatus: 0,
  liveOrder: null as IssuanceOrder | null,
  keys: [] as string[],
  orderRefetch: vi.fn(),
}));

const order: IssuanceOrder = {
  userId: 7,
  orderRef: "TEST-123",
  realEstateId: 1,
  tokenQuantity: 2,
  statusCode: "AWAITING_PAYMENT",
  unitPrice: "0.10",
  currencyCode: "CHF",
  grossAmount: "0.20",
  feeAmount: "0.00",
  amountDue: "0.20",
  fees: [],
  reservationExpiresAt: "2099-01-01T10:15:00Z",
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T10:00:00Z",
};

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({
    user: {
      id: 7,
      kyc_status: "verified",
      kyc_expires_at: "2099-01-01T00:00:00Z",
    },
    userLoading: false,
    isInvestor: true,
  }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useRealEstate: () => ({
    data: {
      id: 1,
      title: "Test offering",
      status: "fundraising",
      configuration: {
        price_per_share: "0.10",
        total_shares: "1000",
        currency_code: "CHF",
        entry_fee_rate: "2",
      },
      progression: { tokens_sold: 0 },
    },
    refetch: vi.fn(),
  }),
  useOrders: () => ({
    data: state.ordersError && !state.staleOrders ? undefined : [],
    isError: state.ordersError,
    error: new Error("Orders unavailable"),
    refetch: vi.fn(),
  }),
  useOrder: (ref: string | undefined) => ({
    data: ref ? state.liveOrder : undefined,
    isError: !!ref && state.orderError,
    error: new Error("Order unavailable"),
    refetch: state.orderRefetch,
  }),
  useCreateOrder: () => ({
    isPending: false,
    isError: state.mutationError,
    error: new Error("Connection interrupted"),
    reset: () => {
      state.mutationError = false;
    },
    mutate: (
      input: { idempotencyKey: string },
      callbacks: {
        onSuccess: (value: IssuanceOrder) => void;
        onError: (error: Error) => void;
      },
    ) => {
      state.keys.push(input.idempotencyKey);
      if (state.failNext) {
        state.failNext = false;
        state.mutationError = true;
        callbacks.onError(
          state.failureStatus
            ? new ApiError(state.failureStatus, "The order was rejected")
            : new Error("Connection interrupted"),
        );
      } else {
        state.liveOrder = order;
        callbacks.onSuccess(order);
      }
    },
  }),
}));

function renderPage() {
  return render(
    <TooltipProvider>
      <BuyPage />
    </TooltipProvider>,
  );
}

function acknowledgeAndSubmit() {
  fireEvent.click(screen.getByRole("checkbox", { name: /risk disclosure/i }));
  fireEvent.click(
    screen.getByRole("checkbox", { name: /subscription terms/i }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /place order|retry order/i }),
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  state.ordersError = false;
  state.staleOrders = false;
  state.orderError = false;
  state.mutationError = false;
  state.failNext = false;
  state.failureStatus = 0;
  state.liveOrder = null;
  state.keys = [];
  state.orderRefetch.mockReset();
  state.orderRefetch.mockImplementation(async () => ({
    isSuccess: !state.orderError,
  }));
});

it("calculates budget shares and remaining money exactly, excluding fees", () => {
  renderPage();
  fireEvent.click(
    screen.getByRole("radio", { name: /budget excluding fees/i }),
  );
  fireEvent.change(screen.getByLabelText("Budget excluding fees (CHF)"), {
    target: { value: "0.35" },
  });
  expect(
    screen.getByText(/3 whole shares; CHF\s?0\.05 remains/),
  ).toBeInTheDocument();
  expect(screen.getByText(/CHF\s0\.31/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review order" }));
  expect(screen.getByText("Review your order")).toHaveFocus();
});

it("does not treat an unavailable order list as zero committed shares", () => {
  state.ordersError = true;
  renderPage();
  expect(
    screen.getByText("Your existing orders could not be checked"),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Review order" })).toBeNull();
});

it("preserves the entered quantity when a background refresh fails", () => {
  const page = renderPage();
  fireEvent.change(screen.getByLabelText("Number of shares"), {
    target: { value: "12" },
  });
  state.ordersError = true;
  state.staleOrders = true;
  page.rerender(
    <TooltipProvider>
      <BuyPage />
    </TooltipProvider>,
  );
  expect(screen.getByLabelText("Number of shares")).toHaveValue("12");
  expect(screen.getByRole("button", { name: "Review order" })).toBeDisabled();
  expect(screen.getByText(/Your entries are preserved/)).toBeInTheDocument();
});

it("reuses the same key after an uncertain result and restores the confirmed order", async () => {
  state.failNext = true;
  const first = renderPage();
  fireEvent.change(screen.getByLabelText("Number of shares"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review order" }));
  acknowledgeAndSubmit();
  expect(state.keys).toHaveLength(1);
  first.unmount();

  const second = renderPage();
  expect(screen.getByLabelText("Number of shares")).toBeDisabled();
  expect(screen.getByText(/may already have been placed/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review saved request" }));
  acknowledgeAndSubmit();
  expect(state.keys).toEqual([state.keys[0], state.keys[0]]);
  expect(await screen.findByText("Order recorded")).toBeInTheDocument();
  second.unmount();

  renderPage();
  expect(await screen.findByText("Order recorded")).toBeInTheDocument();
  expect(screen.getAllByText("TEST-123").length).toBeGreaterThan(0);
  expect(state.keys).toHaveLength(2);
});

it("waits for a fresh order status before showing payment instructions", async () => {
  saveOrderIntent(7, 1, {
    key: "a0b1c2d3-e4f5-4678-9012-abcdefabcdef",
    quantity: 2,
    submitted: true,
    orderRef: order.orderRef,
  });
  state.liveOrder = order;
  let resolveStatus: ((value: { isSuccess: boolean }) => void) | undefined;
  state.orderRefetch.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
  );
  renderPage();
  expect(screen.getByText("Checking order status")).toBeInTheDocument();
  expect(screen.queryByText("Settlement instructions")).toBeNull();
  await act(async () => resolveStatus?.({ isSuccess: true }));
  expect(screen.getByText("Settlement instructions")).toBeInTheDocument();
});

it("allows the amount to be changed after a definitive first rejection", () => {
  state.failNext = true;
  state.failureStatus = 409;
  renderPage();
  fireEvent.change(screen.getByLabelText("Number of shares"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review order" }));
  acknowledgeAndSubmit();
  fireEvent.click(screen.getByRole("button", { name: "Change amount" }));
  expect(screen.getByLabelText("Number of shares")).toHaveValue("2");
  expect(screen.getByLabelText("Number of shares")).toBeEnabled();
});

it("hides payment instructions when the current order status cannot be checked", () => {
  saveOrderIntent(7, 1, {
    key: "a0b1c2d3-e4f5-4678-9012-abcdefabcdef",
    quantity: 2,
    submitted: true,
    orderRef: order.orderRef,
  });
  state.liveOrder = order;
  state.orderError = true;
  renderPage();
  expect(
    screen.getByText("Current order status could not be checked"),
  ).toBeInTheDocument();
  expect(screen.queryByText("Settlement instructions")).toBeNull();
});

it("does not overwrite an unassigned older request without an explicit decision", () => {
  window.sessionStorage.setItem(
    "tooken:order-intent:1",
    JSON.stringify({
      key: "b0b1c2d3-e4f5-4678-9012-abcdefabcdef",
      quantity: 2,
    }),
  );
  renderPage();
  expect(screen.getByText("Earlier unassigned request")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review order" })).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Resume my earlier request" }),
  );
  expect(screen.getByLabelText("Number of shares")).toHaveValue("2");
  expect(
    screen.getByRole("button", { name: "Review saved request" }),
  ).toBeEnabled();
});
