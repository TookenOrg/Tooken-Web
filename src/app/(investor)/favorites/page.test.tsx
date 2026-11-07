import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import FavoritesPage from "./page";

const state = vi.hoisted(() => ({ refreshUser: vi.fn() }));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({
    user: undefined,
    userLoading: false,
    refreshUser: state.refreshUser,
  }),
}));

vi.mock("@/lib/favorites", () => ({
  useFavorites: () => ({ data: undefined, isError: false, isLoading: false }),
}));

it("offers recovery when account details are unavailable", () => {
  render(<FavoritesPage />);
  expect(screen.getByText("Watchlist unavailable")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(state.refreshUser).toHaveBeenCalledOnce();
});
