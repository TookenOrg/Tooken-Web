import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { KycVerification, User } from "@/lib/api/types";
import UsersPage from "./page";

const state = vi.hoisted(() => ({
  filings: [] as KycVerification[],
  isAdmin: true,
  version: 1,
  mutate: vi.fn((..._args: unknown[]) => {}),
  reset: vi.fn(),
  listCalls: vi.fn((..._args: unknown[]) => {}),
  refetch: vi.fn(async () => ({
    data: [] as KycVerification[],
    isError: false,
  })),
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({
    user: { id: 99 },
    claims: { userId: 99 },
    isAdmin: state.isAdmin,
    userLoading: false,
  }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useKycList: (...args: unknown[]) => {
    state.listCalls(...args);
    return {
      data: state.filings,
      dataUpdatedAt: state.version,
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: state.refetch,
    };
  },
  useUpdateUserRole: () => ({
    mutate: state.mutate,
    reset: state.reset,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function filing(overrides: Partial<KycVerification>): KycVerification {
  return {
    id: 1,
    user_id: 1,
    declared_full_name: "Alex Investor",
    declared_country_code: "LU",
    email: "alex@example.test",
    status: "approved",
    user_role: "USER",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

type Callbacks = {
  onSuccess: (user: User) => void;
  onError: (error: unknown) => void;
  onSettled: () => void;
};

beforeEach(() => {
  state.filings = [];
  state.isAdmin = true;
  state.version = 1;
  state.mutate.mockClear();
  state.reset.mockClear();
  state.listCalls.mockClear();
  state.refetch.mockClear();
});

it("displays actual account roles in the directory instead of Unchanged", () => {
  state.filings = (["USER", "MANAGER", "ADMIN", undefined] as const).map(
    (role, index) =>
      filing({
        id: index + 1,
        user_id: index + 1,
        declared_full_name: `Account ${index + 1}`,
        email: `account${index + 1}@example.test`,
        user_role: role,
      }),
  );
  render(<UsersPage />);
  for (const [index, label] of [
    "Investor",
    "Manager",
    "Administrator",
    "Current role unavailable",
  ].entries()) {
    const row = screen.getByText(`Account ${index + 1}`).closest("li");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText(label)).toBeInTheDocument();
  }
  expect(screen.queryByText("Unchanged")).not.toBeInTheDocument();
  expect(
    screen.getByText("This list is not a complete account directory."),
  ).toBeInTheDocument();
});

it("blocks a known identical role and any change to the administrator's own account", () => {
  state.filings = [
    filing({ id: 1, user_id: 1, user_role: "MANAGER" }),
    filing({
      id: 2,
      user_id: 99,
      declared_full_name: "Current Admin",
      email: "admin@example.test",
      user_role: "ADMIN",
    }),
  ];
  render(<UsersPage />);
  fireEvent.click(screen.getByRole("button", { name: /Select Alex Investor/ }));
  expect(
    screen.getByRole("button", { name: "Review role change" }),
  ).toBeDisabled();
  expect(
    screen.getByText("Choose a different role from the current role."),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Select Current Admin/ }));
  expect(
    screen.getByRole("button", { name: "Review role change" }),
  ).toBeDisabled();
  expect(
    screen.getAllByText("You cannot change your own role.").length,
  ).toBeGreaterThan(0);
  expect(state.mutate).not.toHaveBeenCalled();
});

it("distinguishes homonyms, confirms old and new roles and waits for the server", () => {
  state.filings = [
    filing({ id: 1, user_id: 1, email: "first@example.test" }),
    filing({ id: 2, user_id: 2, email: "second@example.test" }),
  ];
  const { rerender } = render(<UsersPage />);
  fireEvent.click(
    screen.getByRole("button", { name: /second@example.test, account 2/ }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Review role change" }));
  const dialog = screen.getByRole("alertdialog");
  expect(dialog).toHaveTextContent("second@example.test");
  expect(dialog).toHaveTextContent("Account #2");
  expect(within(dialog).getByText("Investor")).toBeInTheDocument();
  expect(within(dialog).getByText("Manager")).toBeInTheDocument();
  const confirm = within(dialog).getByRole("button", { name: "Change role" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(state.mutate).toHaveBeenCalledTimes(1);
  expect(state.mutate.mock.calls[0][0]).toEqual({ userId: 2, role: "MANAGER" });
  expect(screen.queryByText("Last confirmed change")).toBeNull();

  const callbacks = state.mutate.mock.calls[0][1] as Callbacks;
  act(() => {
    callbacks.onSuccess({
      id: 2,
      full_name: "Alex Investor",
      email: "second@example.test",
      role: "MANAGER",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    callbacks.onSettled();
  });
  expect(screen.getByText("Last confirmed change")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Review role change" }),
  ).toBeDisabled();

  state.filings = [
    state.filings[0],
    { ...state.filings[1], user_role: "ADMIN" },
  ];
  state.version += 1;
  rerender(<UsersPage />);
  const selected = screen.getByText("Selected account").closest("section");
  expect(
    within(selected as HTMLElement).getByText("Administrator"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Review role change" }),
  ).toBeEnabled();
});

it("keeps an ID outside the filing list and its current role explicitly unknown", () => {
  render(<UsersPage />);
  fireEvent.click(screen.getByText("Use an account ID (advanced)"));
  fireEvent.change(screen.getByLabelText("Account ID"), {
    target: { value: "4242" },
  });
  expect(screen.getByText("Current role unavailable")).toBeInTheDocument();
  expect(
    screen.getByText(/Identity cannot be previewed for this ID/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review role change" }));
  const dialog = screen.getByRole("alertdialog");
  expect(dialog).toHaveTextContent("Account #4242");
  expect(within(dialog).getByText("Unavailable")).toBeInTheDocument();
  expect(within(dialog).getByText("Manager")).toBeInTheDocument();
});

it("invalidates a confirmation if refreshed identity or role changes", () => {
  state.filings = [filing({})];
  const { rerender } = render(<UsersPage />);
  fireEvent.click(screen.getByRole("button", { name: /Select Alex Investor/ }));
  fireEvent.click(screen.getByRole("button", { name: "Review role change" }));
  state.filings = [{ ...state.filings[0], user_role: "ADMIN" }];
  state.version += 1;
  rerender(<UsersPage />);
  const dialog = screen.getByRole("alertdialog");
  expect(
    within(dialog).getByText(/Account information changed/),
  ).toBeInTheDocument();
  expect(
    within(dialog).getByRole("button", { name: "Change role" }),
  ).toBeDisabled();
  expect(state.mutate).not.toHaveBeenCalled();
});

it("does not fetch or allow changes for a non-administrator", () => {
  state.isAdmin = false;
  render(<UsersPage />);
  expect(state.listCalls).toHaveBeenCalledWith({}, false);
  expect(screen.getByText("Administrator access required")).toBeInTheDocument();
  expect(state.mutate).not.toHaveBeenCalled();
});
