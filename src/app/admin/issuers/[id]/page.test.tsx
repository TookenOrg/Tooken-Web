import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { Issuer } from "@/lib/api/types";
import IssuerDetailPage from "./page";

const state = vi.hoisted(() => ({
  issuer: undefined as Issuer | undefined,
  dissolve: vi.fn(),
  update: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "42" }) }));
vi.mock("@/lib/api/hooks", () => ({
  useIssuer: () => ({
    data: state.issuer,
    isLoading: false,
    isError: false,
    refetch: state.refetch,
  }),
  useUpdateIssuer: () => ({
    mutate: state.update,
    mutateAsync: state.update,
    reset: state.reset,
    isPending: false,
    isError: false,
  }),
  useDeleteIssuer: () => ({
    mutate: state.dissolve,
    reset: state.reset,
    isPending: false,
    isError: false,
  }),
  useRealEstates: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock("@/app/admin/assets/_components/use-asset-details", () => ({
  useAssetDetails: () => ({
    byId: new Map(),
    isLoading: false,
    isError: false,
    refetchFailed: vi.fn(),
  }),
}));
vi.mock("@/components/app/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Confirm dissolution">
        <button type="button" onClick={onConfirm}>
          Confirm dissolution
        </button>
      </div>
    ) : null,
}));

const issuer: Issuer = {
  id: 42,
  name: "Example issuer",
  legal_form: "SA",
  country_code: "LU",
  registration_number: "B123",
  status_id: 2,
  status: "active",
  real_estate_count: 2,
};

beforeEach(() => {
  state.issuer = { ...issuer };
  state.dissolve.mockClear();
  state.update.mockClear();
  state.reset.mockClear();
});

it("starts in consultation, preserves issuer context and blocks dissolution with assets", () => {
  render(<IssuerDetailPage />);
  expect(screen.queryByLabelText(/Legal name/)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /New asset/ })).toHaveAttribute(
    "href",
    "/admin/assets/new?issuerId=42",
  );
  expect(
    screen.getByRole("button", { name: "Dissolve issuer" }),
  ).toBeDisabled();
  expect(screen.getByText(/carries 2 assets/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Edit legal details/ }));
  expect(screen.getByLabelText(/Legal name/)).toHaveValue("Example issuer");
});

it("requires a known zero count and a separate confirmation", () => {
  state.issuer = { ...issuer, real_estate_count: undefined };
  const { rerender } = render(<IssuerDetailPage />);
  expect(
    screen.getByRole("button", { name: "Dissolve issuer" }),
  ).toBeDisabled();
  expect(
    screen.getByText(/attached asset count is unavailable/),
  ).toBeInTheDocument();

  state.issuer = { ...issuer, real_estate_count: 0 };
  rerender(<IssuerDetailPage />);
  fireEvent.click(screen.getByRole("button", { name: "Dissolve issuer" }));
  expect(state.dissolve).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm dissolution" }));
  expect(state.dissolve).toHaveBeenCalledWith(42, expect.any(Object));
});

it("closes confirmation if assets appear and makes dissolved issuers read-only", () => {
  state.issuer = { ...issuer, real_estate_count: 0 };
  const { rerender } = render(<IssuerDetailPage />);
  fireEvent.click(screen.getByRole("button", { name: "Dissolve issuer" }));
  state.issuer = { ...issuer, real_estate_count: 1 };
  rerender(<IssuerDetailPage />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(state.dissolve).not.toHaveBeenCalled();

  state.issuer = { ...issuer, status: "dissolved", status_id: 4 };
  rerender(<IssuerDetailPage />);
  expect(
    screen.queryByRole("link", { name: /New asset/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Edit legal details/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/read-only and cannot carry new assets/),
  ).toBeInTheDocument();
});
