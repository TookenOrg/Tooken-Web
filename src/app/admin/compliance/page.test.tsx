import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { KycVerification } from "@/lib/api/types";
import CompliancePage from "./page";

const state = vi.hoisted(() => ({
  isAdmin: true,
  files: [] as KycVerification[],
  isError: false,
  isPending: false,
  listCalls: vi.fn((..._args: unknown[]) => {}),
  detailCalls: vi.fn((..._args: unknown[]) => {}),
  refetch: vi.fn(async () => {}),
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({ isAdmin: state.isAdmin, userLoading: false }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useKycList: (...args: unknown[]) => {
    state.listCalls(...args);
    return {
      data: state.isError ? undefined : state.files,
      isPending: state.isPending,
      isError: state.isError,
      isFetching: false,
      error: new Error("List unavailable"),
      refetch: state.refetch,
    };
  },
  useKyc: state.detailCalls,
}));

function file(overrides: Partial<KycVerification>): KycVerification {
  return {
    id: 1,
    user_id: 1,
    status: "submitted",
    declared_full_name: "Investor",
    declared_country_code: "LU",
    email: "investor@example.test",
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  state.isAdmin = true;
  state.isError = false;
  state.isPending = false;
  state.files = [];
  state.listCalls.mockClear();
  state.detailCalls.mockClear();
  state.refetch.mockClear();
});

it("orders submissions oldest first and preserves the review tab when searching", () => {
  state.files = [
    file({
      id: 1,
      declared_full_name: "Newer Investor",
      submitted_at: "2021-01-01T00:00:00Z",
    }),
    file({
      id: 2,
      declared_full_name: "Older Investor",
      submitted_at: "2020-01-01T00:00:00Z",
    }),
    file({
      id: 3,
      declared_full_name: "Unknown date",
      submitted_at: undefined,
    }),
    file({ id: 4, status: "approved" }),
  ];
  const { container } = render(<CompliancePage />);
  const mobileList = container.querySelector("ul.divide-y");
  expect(mobileList).not.toBeNull();
  const links = within(mobileList as HTMLElement).getAllByRole("link");
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "/admin/compliance/2",
    "/admin/compliance/1",
    "/admin/compliance/3",
  ]);
  expect(
    within(mobileList as HTMLElement).getByText("Submission date unavailable"),
  ).toBeInTheDocument();

  fireEvent.change(
    screen.getByRole("searchbox", { name: "Search KYC files" }),
    {
      target: { value: "Newer" },
    },
  );
  expect(screen.getByRole("tab", { name: /To review/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(within(mobileList as HTMLElement).getAllByRole("link")).toHaveLength(
    1,
  );
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Search KYC files" }),
    {
      target: { value: "no match" },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("tab", { name: /To review/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

it("does not fetch every approved detail or fabricate a registration queue", () => {
  state.files = Array.from({ length: 25 }, (_, index) =>
    file({
      id: index + 1,
      user_id: index + 1,
      status: "approved",
      declared_full_name: `Investor ${index + 1}`,
    }),
  );
  render(<CompliancePage />);
  expect(state.listCalls).toHaveBeenCalledWith({}, true);
  expect(state.detailCalls).not.toHaveBeenCalled();
  expect(
    screen.getByText("Registration status is not available in this list"),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("tab", { name: /registration pending/i }),
  ).toBeNull();
  expect(
    screen.getAllByText("Registry verdict unavailable").length,
  ).toBeGreaterThan(0);
});

it("does not show zero counts when the list fails and supports retry", () => {
  state.isError = true;
  render(<CompliancePage />);
  expect(screen.getByRole("tab", { name: "To review" })).toBeInTheDocument();
  expect(screen.getByText("List unavailable")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(state.refetch).toHaveBeenCalledOnce();
});

it("does not fetch compliance data for a non-administrator", () => {
  state.isAdmin = false;
  render(<CompliancePage />);
  expect(state.listCalls).toHaveBeenCalledWith({}, false);
  expect(screen.getByText("Administrator access required")).toBeInTheDocument();
});
