import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { RealEstate } from "@/lib/api/types";
import RealEstateDetailPage from "./page";

const state = vi.hoisted(() => ({
  session: {} as Record<string, unknown>,
  estate: {
    data: undefined as RealEstate | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  token: { data: null, isLoading: false },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "42" }),
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => state.session,
}));

vi.mock("@/lib/api/hooks", () => ({
  useRealEstate: () => state.estate,
  useTokenInfos: () => state.token,
}));

vi.mock("@/components/app/favorite-button", () => ({
  FavoriteButton: () => <button type="button">Add to watchlist</button>,
}));

function fixture(): RealEstate {
  return {
    id: 42,
    title: "River House",
    status: "fundraising",
    configuration: {
      currency_code: "EUR",
      total_shares: "100",
      price_per_share: "100.00",
      total_valuation: "10000.00",
      min_investment: "200.00",
      yield: 0,
    },
    progression: { tokens_sold: 10 },
    token: {
      token_name: "River",
      symbol: "RIV",
      address: "0x1234567890123456789012345678901234567890",
      nb_decimal: 18,
    },
    address: {
      street: "1 Private Street",
      postal_code: "1234",
      city: "Luxembourg",
      country_code: "LU",
    },
  };
}

function investor(kycStatus = "verified", expiresAt = "2099-01-01T00:00:00Z") {
  state.session = {
    ready: true,
    isAuthenticated: true,
    userLoading: false,
    isStaff: false,
    isInvestor: true,
    role: "USER",
    user: { kyc_status: kycStatus, kyc_expires_at: expiresAt },
    refreshUser: vi.fn(),
  };
}

function renderPage() {
  return render(
    <TooltipProvider>
      <RealEstateDetailPage />
    </TooltipProvider>,
  );
}

describe("Offering subscription summary", () => {
  beforeEach(() => {
    state.estate.data = fixture();
    state.estate.isLoading = false;
    state.estate.isError = false;
    state.estate.refetch.mockReset();
    state.session = {
      ready: true,
      isAuthenticated: false,
      userLoading: false,
      isStaff: false,
      isInvestor: false,
      refreshUser: vi.fn(),
    };
  });

  it("places one compact action after the figures and preserves anonymous callbacks", () => {
    renderPage();
    const summary = screen.getByRole("region", { name: "Subscription" });
    const figures = screen.getByText("Total valuation").closest("dl");
    expect(figures?.compareDocumentPosition(summary)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      screen.getAllByRole("region", { name: "Subscription" }),
    ).toHaveLength(1);
    expect(within(summary).getByText("€200.00")).toBeInTheDocument();
    expect(
      within(summary).getByRole("link", { name: "Sign in to continue" }),
    ).toHaveAttribute("href", "/sign-in?callbackUrl=%2Freal-estate%2F42%2Fbuy");
    expect(
      within(summary).getByRole("link", { name: "Open an account" }),
    ).toHaveAttribute("href", "/sign-up?callbackUrl=%2Freal-estate%2F42%2Fbuy");
    expect(screen.queryByText("1 Private Street")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Invest" }),
    ).not.toBeInTheDocument();
  });

  it("allows only a verified, unexpired investor to continue", () => {
    investor("pending");
    const { rerender } = renderPage();
    expect(
      screen.getByText("Identity verification required"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View verification" }),
    ).toHaveAttribute("href", "/verification");
    expect(
      screen.queryByRole("link", { name: "Invest" }),
    ).not.toBeInTheDocument();

    investor("verified", "2020-01-01T00:00:00Z");
    rerender(
      <TooltipProvider>
        <RealEstateDetailPage />
      </TooltipProvider>,
    );
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Invest" }),
    ).not.toBeInTheDocument();

    investor();
    rerender(
      <TooltipProvider>
        <RealEstateDetailPage />
      </TooltipProvider>,
    );
    expect(screen.getByRole("link", { name: "Invest" })).toHaveAttribute(
      "href",
      "/real-estate/42/buy",
    );
  });

  it.each(["MANAGER", "ADMIN"])(
    "keeps %s in the back office and shows the staff-only address",
    (role) => {
      state.session = {
        ready: true,
        isAuthenticated: true,
        userLoading: false,
        isStaff: true,
        isInvestor: false,
        role,
      };
      renderPage();
      expect(
        screen.getByRole("link", { name: /Open in back office/ }),
      ).toHaveAttribute("href", "/admin/assets/42");
      expect(screen.getByText("1 Private Street")).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Invest" }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([
    ["published", 10, "Subscriptions not open"],
    ["closed", 10, "Subscriptions closed"],
    ["fundraising", 100, "Fully subscribed"],
  ] as const)(
    "does not offer Invest for %s with %i shares sold",
    (status, sold, message) => {
      investor();
      const estate = state.estate.data as RealEstate;
      estate.status = status;
      estate.progression = { tokens_sold: sold };
      renderPage();
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Explore other offerings" }),
      ).toHaveAttribute("href", "/explore");
      expect(
        screen.queryByRole("link", { name: "Invest" }),
      ).not.toBeInTheDocument();
    },
  );

  it("distinguishes unknown availability from a sold-out offering and permits retry", () => {
    investor();
    const estate = state.estate.data as RealEstate;
    estate.progression = {};
    renderPage();
    expect(
      screen.getByText("Subscription information unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Fully subscribed")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Invest" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.estate.refetch).toHaveBeenCalledOnce();
  });

  it("does not offer Invest when price or account information is unavailable", () => {
    investor();
    const estate = state.estate.data as RealEstate;
    estate.configuration = {
      ...estate.configuration,
      currency_code: undefined,
    };
    const { rerender } = renderPage();
    expect(
      screen.getByText("Subscription information unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Invest" }),
    ).not.toBeInTheDocument();

    estate.configuration = fixture().configuration;
    const refreshUser = vi.fn();
    state.session = {
      ready: true,
      isAuthenticated: true,
      userLoading: false,
      isStaff: false,
      isInvestor: false,
      refreshUser,
    };
    rerender(
      <TooltipProvider>
        <RealEstateDetailPage />
      </TooltipProvider>,
    );
    expect(
      screen.getByText("Account information unavailable"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry account" }));
    expect(refreshUser).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("link", { name: "Invest" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    [undefined, undefined],
    ["verified", "invalid-date"],
  ] as const)(
    "does not infer eligibility or expiration from an unknown verification state",
    (status, expiresAt) => {
      investor();
      state.session.user = { kyc_status: status, kyc_expires_at: expiresAt };
      renderPage();
      expect(
        screen.getByText("Account information unavailable"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Not started")).not.toBeInTheDocument();
      expect(screen.queryByText("Expired")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Invest" }),
      ).not.toBeInTheDocument();
    },
  );

  it("retains exact large share counts", () => {
    investor();
    const estate = state.estate.data as RealEstate;
    estate.configuration = {
      ...estate.configuration,
      total_shares: "9007199254740993",
    };
    renderPage();
    expect(screen.getByText("9,007,199,254,740,983")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Invest" })).toBeInTheDocument();
  });

  it("does not round a configured price, minimum or fee into zero", () => {
    investor();
    const estate = state.estate.data as RealEstate;
    estate.configuration = {
      ...estate.configuration,
      price_per_share: "0.00000001",
      min_investment: "0.00001234",
      entry_fee_rate: "0.00000001",
    };
    renderPage();
    expect(screen.getAllByText("€0.00000001").length).toBeGreaterThan(0);
    expect(screen.getByText("€0.00001234")).toBeInTheDocument();
    expect(screen.getByText("0.00000001 %")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Invest" })).toBeInTheDocument();
  });

  it("states that documents are unavailable and keeps technical details copyable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderPage();
    expect(
      screen.getByText("Offering documents unavailable"),
    ).toBeInTheDocument();
    const summary = screen.getByText("Technical details");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("Decimals")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "0x1234567890123456789012345678901234567890",
      ),
    );
  });
});
