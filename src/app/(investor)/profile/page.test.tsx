import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { KycOnChainStatus, User } from "@/lib/api/types";
import ProfilePage from "./page";

const state = vi.hoisted(() => ({
  user: undefined as User | undefined,
  isInvestor: true,
  isStaff: false,
  registry: undefined as KycOnChainStatus | undefined,
  registryError: false,
  registryCalls: vi.fn((..._args: unknown[]) => {}),
  refreshUser: vi.fn(async () => {}),
  refreshRegistry: vi.fn(async () => {}),
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({
    user: state.user,
    role: state.user?.role,
    userLoading: false,
    isInvestor: state.isInvestor,
    isStaff: state.isStaff,
    refreshUser: state.refreshUser,
  }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useMyKycOnChain: (interval: number | false) => {
    state.registryCalls(interval);
    return {
      data: state.registry,
      isLoading: false,
      isError: state.registryError,
      isFetching: false,
      refetch: state.refreshRegistry,
    };
  },
}));

function investor(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    full_name: "Ada Investor",
    email: "ada@example.test",
    role: "USER",
    kyc_status: "verified",
    kyc_expires_at: "2099-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  state.user = investor();
  state.isInvestor = true;
  state.isStaff = false;
  state.registry = { user_id: 7, is_verified: false };
  state.registryError = false;
  state.registryCalls.mockClear();
  state.refreshRegistry.mockClear();
});

it("shows conflicting account and registry states without an eligibility claim", () => {
  render(<ProfilePage />);
  expect(screen.getByText("Verification statuses differ")).toBeInTheDocument();
  expect(screen.queryByText("Ready to invest")).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "View verification" }),
  ).toHaveAttribute("href", "/verification");
  expect(screen.queryByText("Not registered")).toBeNull();
  expect(screen.getByText("Workspace information")).toBeInTheDocument();
  expect(
    screen.queryByText(/notifications|distribution notices|8 hours/i),
  ).toBeNull();
});

it("offers recovery instead of trusting a stale registry result after an error", () => {
  state.registry = { user_id: 7, is_verified: true };
  state.registryError = true;
  render(<ProfilePage />);
  expect(screen.getByText("Eligibility unavailable")).toBeInTheDocument();
  expect(screen.queryByText("Ready to invest")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry registry check" }));
  expect(state.refreshRegistry).toHaveBeenCalledOnce();
});

it("does not fetch or display investor verification for staff", () => {
  state.user = investor({ role: "MANAGER" });
  state.isInvestor = false;
  state.isStaff = true;
  render(<ProfilePage />);
  expect(state.registryCalls).not.toHaveBeenCalled();
  expect(screen.queryByRole("link", { name: "View verification" })).toBeNull();
  expect(
    screen.queryByText(/eligible to invest|on-chain identity/i),
  ).toBeNull();
  expect(screen.getByRole("link", { name: "Sign out" })).toHaveAttribute(
    "href",
    "/logout",
  );
});
