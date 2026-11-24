import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { KycVerification } from "@/lib/api/types";
import KycFilePage from "./page";

const state = vi.hoisted(() => ({
  file: undefined as KycVerification | undefined,
  isAdmin: true,
  approve: vi.fn((..._args: unknown[]) => {}),
  reject: vi.fn((..._args: unknown[]) => {}),
  revoke: vi.fn((..._args: unknown[]) => {}),
  sync: vi.fn((..._args: unknown[]) => {}),
  refetch: vi.fn(async () => ({
    data: undefined as KycVerification | undefined,
    isError: false,
  })),
  detailCalls: vi.fn((..._args: unknown[]) => {}),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "12" }),
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({ isAdmin: state.isAdmin, userLoading: false }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useKyc: (id: number | undefined) => {
    state.detailCalls(id);
    return {
      data: state.file,
      isPending: false,
      isError: false,
      refetch: state.refetch,
    };
  },
  useApproveKyc: () => ({ mutate: state.approve, isPending: false }),
  useRejectKyc: () => ({ mutate: state.reject, isPending: false }),
  useRevokeKyc: () => ({ mutate: state.revoke, isPending: false }),
  useSyncKycOnChain: () => ({ mutate: state.sync, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

type Callbacks = {
  onSuccess: (value?: unknown) => void;
  onError: (error: unknown) => void;
  onSettled: () => void;
};

function filing(overrides: Partial<KycVerification> = {}): KycVerification {
  return {
    id: 12,
    user_id: 7,
    status: "submitted",
    declared_full_name: "Ada Investor",
    declared_country_code: "LU",
    email: "ada@example.test",
    submitted_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    kyc_status: "pending",
    ...overrides,
  };
}

beforeEach(() => {
  state.file = filing();
  state.isAdmin = true;
  state.approve.mockClear();
  state.reject.mockClear();
  state.revoke.mockClear();
  state.sync.mockClear();
  state.detailCalls.mockClear();
  state.refetch.mockReset();
  state.refetch.mockImplementation(async () => ({
    data: state.file,
    isError: false,
  }));
});

it("links invalid expiry to its field and blocks duplicate approval", () => {
  render(<KycFilePage />);
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  const dialog = screen.getByRole("alertdialog");
  const expiry = within(dialog).getByLabelText(/Approval valid until/);
  fireEvent.change(expiry, { target: { value: "2000-01-01" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
  expect(expiry).toHaveAttribute("aria-invalid", "true");
  expect(expiry).toHaveAccessibleDescription(
    "Choose a valid expiry date in the future.",
  );
  expect(state.approve).not.toHaveBeenCalled();

  fireEvent.change(expiry, { target: { value: "2099-12-31" } });
  const confirm = within(dialog).getByRole("button", { name: "Approve" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(state.approve).toHaveBeenCalledTimes(1);
  expect(state.approve.mock.calls[0][0]).toEqual({
    id: 12,
    expiresAt: "2099-12-31T00:00:00.000Z",
  });
  const callbacks = state.approve.mock.calls[0][1] as Callbacks;
  act(() => {
    callbacks.onError(new Error("Approval unavailable"));
    callbacks.onSettled();
  });
  expect(within(dialog).getByRole("alert")).toHaveTextContent(
    "Approval unavailable",
  );
  expect(expiry).toHaveValue("2099-12-31");
});

it.each(["reject", "revoke"] as const)(
  "requires and retains a reason for %s",
  (kind) => {
    if (kind === "revoke") {
      state.file = filing({
        status: "approved",
        kyc_status: "approved",
        expires_at: "2099-01-01T00:00:00Z",
      });
    }
    render(<KycFilePage />);
    const label = kind === "reject" ? "Reject" : "Revoke";
    fireEvent.click(screen.getByRole("button", { name: label }));
    const dialog = screen.getByRole("alertdialog");
    const reason = within(dialog).getByLabelText(/Reason/);
    fireEvent.click(within(dialog).getByRole("button", { name: label }));
    expect(reason).toHaveAccessibleDescription(
      "Enter a reason of at least 3 characters.",
    );
    const mutation = kind === "reject" ? state.reject : state.revoke;
    expect(mutation).not.toHaveBeenCalled();
    fireEvent.change(reason, { target: { value: "Declared details differ" } });
    const confirm = within(dialog).getByRole("button", { name: label });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mutation).toHaveBeenCalledTimes(1);
    expect(mutation.mock.calls[0][0]).toEqual({
      id: 12,
      reason: "Declared details differ",
    });
    const callbacks = mutation.mock.calls[0][1] as Callbacks;
    act(() => {
      callbacks.onError(new Error("Decision unavailable"));
      callbacks.onSettled();
    });
    expect(reason).toHaveValue("Declared details differ");
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Decision unavailable",
    );
  },
);

it("prioritises a separate sync after approval and allows retry after failure", () => {
  const { rerender } = render(<KycFilePage />);
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  let dialog = screen.getByRole("alertdialog");
  fireEvent.change(within(dialog).getByLabelText(/Approval valid until/), {
    target: { value: "2099-12-31" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
  const approval = state.approve.mock.calls[0][1] as Callbacks;
  act(() => {
    approval.onSuccess();
    approval.onSettled();
  });
  expect(
    screen.getByText("Decision recorded; file refresh pending"),
  ).toBeInTheDocument();
  expect(state.sync).not.toHaveBeenCalled();

  state.file = filing({
    status: "approved",
    kyc_status: "approved",
    expires_at: "2099-12-31T00:00:00Z",
  });
  rerender(<KycFilePage />);
  expect(screen.getByText("Registration status")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sync on-chain" }));
  dialog = screen.getByRole("alertdialog");
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Register on-chain" }),
  );
  const first = state.sync.mock.calls[0][1] as Callbacks;
  act(() => {
    first.onError(new Error("Registry unavailable"));
    first.onSettled();
  });
  expect(within(dialog).getByRole("alert")).toHaveTextContent(
    "Registry unavailable",
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("Registration failed")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry registration" }));
  dialog = screen.getByRole("alertdialog");
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Register on-chain" }),
  );
  const retry = state.sync.mock.calls[1][1] as Callbacks;
  act(() => {
    retry.onSuccess({
      user_id: 7,
      kyc_status: "verified",
      wallet_address: "0xabc",
      identity_address: "0xdef",
      country_code: "LU",
      country_numeric: 442,
      kyc_verified_at: "2026-11-06T00:00:00Z",
      transactions: {},
    });
    retry.onSettled();
  });
  expect(screen.getByText("Registration confirmed")).toBeInTheDocument();
  expect(state.sync).toHaveBeenCalledTimes(2);
});

it("treats missing or account-only registry information as unknown", () => {
  state.file = filing({
    status: "approved",
    kyc_status: undefined,
    expires_at: "2099-01-01T00:00:00Z",
  });
  const { rerender } = render(<KycFilePage />);
  expect(screen.getByText(/Account status is unavailable/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sync on-chain" })).toBeDisabled();
  state.file = { ...state.file, kyc_status: "verified" };
  rerender(<KycFilePage />);
  expect(
    screen.getByText(/independent live registry verdict/),
  ).toBeInTheDocument();
  expect(screen.queryByText("Registration confirmed")).toBeNull();
  expect(screen.getByRole("button", { name: "Sync on-chain" })).toBeDisabled();
});

it("requires a file refresh after an unconfirmed sync response", async () => {
  state.file = filing({
    status: "approved",
    kyc_status: "approved",
    expires_at: "2099-01-01T00:00:00Z",
  });
  render(<KycFilePage />);
  fireEvent.click(screen.getByRole("button", { name: "Sync on-chain" }));
  const dialog = screen.getByRole("alertdialog");
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Register on-chain" }),
  );
  const callbacks = state.sync.mock.calls[0][1] as Callbacks;
  act(() => {
    callbacks.onSuccess({ user_id: 999, kyc_status: "verified" });
    callbacks.onSettled();
  });
  expect(
    screen.getByText("Registration outcome unavailable"),
  ).toBeInTheDocument();
  expect(screen.queryByText("Registration confirmed")).toBeNull();
  expect(screen.getByRole("button", { name: "Sync on-chain" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Refresh file" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Sync on-chain" })).toBeEnabled(),
  );
});

it("does not fetch a file for a non-administrator", () => {
  state.isAdmin = false;
  render(<KycFilePage />);
  expect(state.detailCalls).toHaveBeenCalledWith(undefined);
  expect(screen.getByText("Administrator access required")).toBeInTheDocument();
});
