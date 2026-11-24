import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AssetsPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/api/hooks", () => ({
  useRealEstates: () => ({
    data: [
      { id: 1, title: "Alpha", status: "draft", created_at: "2025-01-01" },
      { id: 2, title: "Beta", status: "funded", created_at: "2026-01-01" },
      { id: 3, title: "Gamma", status: "cancelled" },
    ],
    isLoading: false,
    isError: false,
    isSuccess: true,
  }),
}));
vi.mock("./_components/use-asset-details", () => ({
  useAssetDetails: () => ({
    byId: new Map(),
    failedIds: new Set(),
    isError: false,
    refetchFailed: vi.fn(),
  }),
}));

it("exposes accessible sort state, exact status counts and a reset", () => {
  render(<AssetsPage />);
  const date = screen.getByRole("columnheader", { name: "Created" });
  expect(date).toHaveAttribute("aria-sort", "descending");
  fireEvent.click(screen.getByRole("button", { name: "Asset" }));
  expect(screen.getByRole("columnheader", { name: "Asset" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  fireEvent.click(screen.getByRole("button", { name: /Funded & closed 1/ }));
  expect(screen.getByText("1 of 3 assets")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search assets" }), {
    target: { value: "missing" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(screen.getByText("3 of 3 assets")).toBeInTheDocument();
});
