import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { KycOnChainStatus, User } from "@/lib/api/types";
import VerificationPage from "./page";

const state = vi.hoisted(() => ({
  user: undefined as User | undefined,
  registry: undefined as KycOnChainStatus | undefined,
  registryLoading: false,
  registryError: false,
  submitError: undefined as Error | undefined,
  submit: vi.fn((..._args: unknown[]) => {}),
  refreshUser: vi.fn(async () => {}),
  refreshRegistry: vi.fn(async () => {}),
  registryCalls: vi.fn((..._args: unknown[]) => {}),
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({
    user: state.user,
    userLoading: false,
    isInvestor: true,
    isStaff: false,
    refreshUser: state.refreshUser,
  }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useMyKycOnChain: (interval: number | false) => {
    state.registryCalls(interval);
    return {
      data: state.registry,
      isLoading: state.registryLoading,
      isError: state.registryError,
      isFetching: false,
      refetch: state.refreshRegistry,
    };
  },
  useSubmitKyc: () => ({
    mutate: state.submit,
    isPending: false,
    isError: !!state.submitError,
    error: state.submitError,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function investor(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    full_name: "Ada Investor",
    email: "ada@example.test",
    role: "USER",
    kyc_status: "none",
    country_code: "LU",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  state.user = investor();
  state.registry = { user_id: 7, is_verified: false };
  state.registryLoading = false;
  state.registryError = false;
  state.submitError = undefined;
  state.submit.mockClear();
  state.refreshUser.mockClear();
  state.refreshRegistry.mockClear();
  state.registryCalls.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("links validation errors to the name, country and required attestation", () => {
  state.user = investor({ full_name: "", country_code: null });
  render(<VerificationPage />);
  fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));

  const name = screen.getByLabelText(/Full legal name/);
  const country = screen.getByLabelText(/Country of residence/);
  const attestation = screen.getByRole("checkbox");
  expect(name).toHaveAccessibleDescription("Enter your full legal name.");
  expect(country).toHaveAccessibleDescription(
    "Select your country of residence.",
  );
  expect(attestation).toHaveAccessibleDescription(
    "Confirm the declaration to continue.",
  );
  expect(name).toHaveAttribute("aria-invalid", "true");
  expect(country).toHaveAttribute("aria-invalid", "true");
  expect(attestation).toHaveAttribute("aria-invalid", "true");
  expect(state.submit).not.toHaveBeenCalled();
});

it("keeps the declaration after failure and rejects rapid duplicate submissions", () => {
  const { rerender } = render(<VerificationPage />);
  const name = screen.getByLabelText(/Full legal name/);
  fireEvent.change(name, { target: { value: "Élodie Investor" } });
  fireEvent.click(screen.getByRole("checkbox"));
  const form = screen
    .getByRole("button", { name: "Submit for review" })
    .closest("form");
  expect(form).not.toBeNull();
  if (!form) throw new Error("Verification form not found");
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(state.submit).toHaveBeenCalledTimes(1);
  expect(state.submit.mock.calls[0][0]).toEqual({
    declared_full_name: "Élodie Investor",
    declared_country_code: "LU",
  });
  const callbacks = state.submit.mock.calls[0][1] as { onSettled: () => void };
  act(() => callbacks.onSettled());
  state.submitError = new Error("Network unavailable");
  rerender(<VerificationPage />);
  expect(name).toHaveValue("Élodie Investor");
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(screen.getByRole("alert")).toHaveTextContent("Network unavailable");
});

it("requires a matching live registry verdict before announcing readiness", () => {
  state.user = investor({
    kyc_status: "verified",
    kyc_expires_at: "2099-01-01T00:00:00Z",
  });
  const { rerender } = render(<VerificationPage />);
  expect(screen.getByText("Verification statuses differ")).toBeInTheDocument();
  expect(screen.queryByText("Ready to invest")).not.toBeInTheDocument();

  state.registry = { user_id: 7, is_verified: true };
  state.registryError = true;
  rerender(<VerificationPage />);
  expect(screen.getByText("Eligibility unavailable")).toBeInTheDocument();
  expect(screen.queryByText("Ready to invest")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry registry check" }));
  expect(state.refreshRegistry).toHaveBeenCalledOnce();

  state.registryError = false;
  rerender(<VerificationPage />);
  expect(screen.getByText("Ready to invest")).toBeInTheDocument();
});

it("preserves the declaration while an unavailable registry blocks submission", () => {
  const { rerender } = render(<VerificationPage />);
  const name = screen.getByLabelText(/Full legal name/);
  fireEvent.change(name, { target: { value: "Ada Updated" } });
  fireEvent.click(screen.getByRole("checkbox"));
  state.registryError = true;
  rerender(<VerificationPage />);
  expect(
    screen.getByRole("button", { name: "Submit for review" }),
  ).toBeDisabled();
  expect(
    screen.getByText(
      "Retry the registry check before submitting a declaration.",
    ),
  ).toBeInTheDocument();
  expect(name).toHaveValue("Ada Updated");
  expect(screen.getByRole("checkbox")).toBeChecked();
  state.registryError = false;
  rerender(<VerificationPage />);
  expect(
    screen.getByRole("button", { name: "Submit for review" }),
  ).toBeEnabled();
  expect(name).toHaveValue("Ada Updated");
});

it("preserves five-second account and registry polling during review", () => {
  vi.useFakeTimers();
  state.user = investor({ kyc_status: "pending" });
  const { unmount } = render(<VerificationPage />);
  expect(state.registryCalls).toHaveBeenCalledWith(5000);
  act(() => vi.advanceTimersByTime(10_000));
  expect(state.refreshUser).toHaveBeenCalledTimes(2);
  unmount();
  act(() => vi.advanceTimersByTime(5_000));
  expect(state.refreshUser).toHaveBeenCalledTimes(2);
});

it("does not turn a missing account status into a new filing", () => {
  state.user = investor({ kyc_status: undefined });
  render(<VerificationPage />);
  expect(screen.getByText("Eligibility unavailable")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Submit for review" }),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Refresh statuses" }),
  ).toBeEnabled();
});
