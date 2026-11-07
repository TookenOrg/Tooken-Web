import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { AssetFormValues } from "../_components/asset-payload";
import NewAssetPage from "./page";

const state = vi.hoisted(() => ({
  query: "",
  getIssuer: vi.fn(),
  create: vi.fn(),
  issuer: {
    data: undefined as
      | {
          id: number;
          name: string;
          status: string;
          legal_form: string;
          country_code: string;
          status_id: number;
        }
      | undefined,
    isLoading: false,
    isError: false,
    error: new Error("Issuer unavailable"),
    refetch: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.query),
}));
vi.mock("@/lib/api/hooks", () => ({
  useIssuer: (id: number | undefined) => {
    state.getIssuer(id);
    return state.issuer;
  },
  useCreateRealEstate: () => ({
    mutateAsync: state.create,
    isPending: false,
    isError: false,
  }),
}));
vi.mock("../_components/asset-form", () => ({
  AssetForm: ({
    defaultValues,
    onSubmit,
    notice,
  }: {
    defaultValues: AssetFormValues;
    onSubmit: (values: AssetFormValues) => void;
    notice: React.ReactNode;
  }) => (
    <div>
      {notice}
      <p>Selected issuer: {defaultValues.issuer_id || "none"}</p>
      <button type="button" onClick={() => onSubmit(defaultValues)}>
        Save draft
      </button>
    </div>
  ),
}));

const issuer = {
  id: 42,
  name: "Issuer",
  legal_form: "SA",
  country_code: "LU",
  status_id: 2,
  status: "active",
};

beforeEach(() => {
  state.query = "issuerId=42";
  state.issuer.data = issuer;
  state.issuer.isLoading = false;
  state.issuer.isError = false;
  state.getIssuer.mockClear();
  state.create.mockReset();
});

it("prefills only a verified issuer and blocks it if it becomes dissolved", async () => {
  const { rerender } = render(<NewAssetPage />);
  expect(state.getIssuer).toHaveBeenCalledWith(42);
  expect(screen.getByText("Selected issuer: 42")).toBeInTheDocument();

  state.issuer.data = { ...issuer, status: "dissolved", status_id: 4 };
  rerender(<NewAssetPage />);
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(
    await screen.findByText(/This issuer is dissolved/),
  ).toBeInTheDocument();
  expect(state.create).not.toHaveBeenCalled();
});

it("does not trust an invalid, missing or dissolved issuer context", () => {
  state.query = "issuerId=42&issuerId=99";
  const { rerender } = render(<NewAssetPage />);
  expect(state.getIssuer).toHaveBeenCalledWith(undefined);
  expect(screen.getByText(/issuer link is invalid/)).toBeInTheDocument();
  expect(screen.getByText("Selected issuer: none")).toBeInTheDocument();

  state.query = "issuerId=42";
  state.issuer.data = undefined;
  state.issuer.isError = true;
  rerender(<NewAssetPage />);
  expect(screen.getByText(/context could not be verified/)).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Choose issuer manually" }),
  );
  expect(screen.getByText("Selected issuer: none")).toBeInTheDocument();
});
