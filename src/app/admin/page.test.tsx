import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { IssuanceOrder, KycVerification } from "@/lib/api/types";
import AdminOverviewPage from "./page";

const state = vi.hoisted(() => ({
  isAdmin: true,
  files: [] as KycVerification[],
  get: vi.fn(),
  list: vi.fn(),
  orders: [] as IssuanceOrder[],
  ordersError: false,
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({ isAdmin: state.isAdmin }),
}));

vi.mock("@/lib/api/endpoints", () => ({
  kycApi: { get: state.get },
}));

vi.mock("@/lib/api/hooks", () => ({
  queryKeys: { kyc: (id: number) => ["kyc", id] },
  useKycList: (...args: unknown[]) => {
    state.list(...args);
    return { data: state.files };
  },
  useRealEstates: () => ({ data: [] }),
  useIssuers: () => ({ data: [] }),
  useOrders: () => ({
    data: state.ordersError ? undefined : state.orders,
    isError: state.ordersError,
    error: state.ordersError ? new Error("Orders unavailable") : null,
    refetch: vi.fn(),
  }),
  useHealth: () => ({ data: { status: "ok" } }),
}));

const filing: KycVerification = {
  id: 1,
  user_id: 3,
  status: "submitted",
  declared_full_name: "Test Investor",
  declared_country_code: "LU",
  email: "investor@example.test",
  created_at: "2026-11-03T10:00:00Z",
  updated_at: "2026-11-03T10:00:00Z",
};

beforeEach(() => {
  state.isAdmin = true;
  state.files = [filing];
  state.get.mockReset();
  state.list.mockClear();
  state.orders = [];
  state.ordersError = false;
});

it("does not say all clear when the order source fails", () => {
  state.files = [];
  state.ordersError = true;
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <AdminOverviewPage />
    </QueryClientProvider>,
  );
  expect(screen.queryByText("All clear")).toBeNull();
  expect(screen.getAllByText("Orders unavailable").length).toBeGreaterThan(0);
});

it("never asks a manager to confirm an investor payment", () => {
  state.isAdmin = false;
  state.orders = [
    {
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
      reservationExpiresAt: "2099-01-01T00:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <AdminOverviewPage />
    </QueryClientProvider>,
  );
  expect(
    screen.getByRole("link", { name: /View order · TEST-123/ }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Confirm payment · TEST-123/)).toBeNull();
});

it("replaces review with sync after approval and removes it only after verification", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const page = (
    <QueryClientProvider client={client}>
      <AdminOverviewPage />
    </QueryClientProvider>
  );
  const { rerender, unmount } = render(page);
  expect(screen.getByRole("link", { name: /Review KYC/ })).toHaveAttribute(
    "href",
    "/admin/compliance/1",
  );
  expect(state.list).toHaveBeenCalledWith({}, true);

  state.files = [{ ...filing, status: "approved" }];
  state.get.mockResolvedValue({
    ...filing,
    status: "approved",
    kyc_status: "approved",
  });
  rerender(
    <QueryClientProvider client={client}>
      <AdminOverviewPage />
    </QueryClientProvider>,
  );
  expect(await screen.findByRole("link", { name: /Sync KYC/ })).toHaveAttribute(
    "href",
    "/admin/compliance/1",
  );
  expect(screen.queryByRole("link", { name: /Review KYC/ })).toBeNull();
  expect(screen.queryByText("All clear")).toBeNull();

  act(() => {
    client.setQueryData(["kyc", 1], {
      ...filing,
      status: "approved",
      kyc_status: "verified",
    });
  });
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: /Sync KYC/ })).toBeNull(),
  );
  expect(screen.getByText("All clear")).toBeInTheDocument();
  unmount();
  client.clear();
});

it("does not fetch or show compliance actions for managers", () => {
  state.isAdmin = false;
  state.files = [{ ...filing, status: "approved" }];
  const client = new QueryClient();
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <AdminOverviewPage />
    </QueryClientProvider>,
  );
  expect(state.list).toHaveBeenCalledWith({}, false);
  expect(state.get).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("link", { name: /Sync KYC|Review KYC/ }),
  ).toBeNull();
  unmount();
  client.clear();
});
