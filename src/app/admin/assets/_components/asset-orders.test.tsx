import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AssetOrders } from "./asset-orders";

const state = vi.hoisted(() => ({
  data: undefined as unknown[] | undefined,
  isLoading: false,
  isError: false,
  error: new Error("Orders unavailable"),
  refetch: vi.fn(),
}));
vi.mock("@/lib/api/hooks", () => ({ useOrders: () => state }));

it("does not display zero progress when orders are unavailable", () => {
  state.data = undefined;
  state.isError = true;
  render(
    <AssetOrders asset={{ id: 1, configuration: { total_shares: "100" } }} />,
  );
  expect(screen.queryByText("0.00 %")).not.toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: /Retry/ })[0]);
  expect(state.refetch).toHaveBeenCalledOnce();
});

it("does not calculate a percentage without a total share count", () => {
  state.data = [];
  state.isError = false;
  render(<AssetOrders asset={{ id: 1 }} />);
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(
    screen.getByText(/percentage cannot be calculated/),
  ).toBeInTheDocument();
});
