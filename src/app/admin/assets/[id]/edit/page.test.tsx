import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import type { RealEstate } from "@/lib/api/types";
import EditAssetPage from "./page";

const state = vi.hoisted(() => ({
  asset: undefined as RealEstate | undefined,
  update: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "7" }),
  useRouter: () => ({ push: state.push }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/api/hooks", () => ({
  useRealEstate: () => ({
    data: state.asset,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useIssuers: () => ({
    data: [{ id: 1, name: "Issuer", legal_form: "SA", status: "active" }],
    isLoading: false,
    isError: false,
    isSuccess: true,
  }),
  useUpdateRealEstate: () => {
    const [error, setError] = useState<Error>();
    return {
      isPending: false,
      isError: !!error,
      error,
      mutateAsync: async (patch: unknown) => {
        state.update(patch);
        const conflict = new Error("The asset changed on the server");
        setError(conflict);
        throw conflict;
      },
    };
  },
}));

beforeEach(() => {
  state.asset = {
    id: 7,
    title: "Original asset",
    description: "Original description",
    estate_type_id: 1,
    issuer: { id: 1 },
    address: {
      street: "1 High Street",
      postal_code: "1234",
      city: "Luxembourg",
      country_code: "LU",
    },
  };
  state.update.mockClear();
  state.push.mockClear();
  window.history.replaceState({}, "", "/admin/assets/7/edit");
});

it("preserves input and focuses a conflict while patching against the edit snapshot", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<EditAssetPage />);
  const description = screen.getByLabelText("Description");
  await user.clear(description);
  await user.type(description, "My changes");

  state.asset = { ...state.asset, id: 7, title: "Changed elsewhere" };
  rerender(<EditAssetPage />);
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({ description: "My changes" }),
  );
  expect(description).toHaveValue("My changes");
  const alert = await screen.findByText("The changes were refused");
  await waitFor(() => expect(alert.closest("[role=alert]")).toHaveFocus());
  expect(state.push).not.toHaveBeenCalled();
});

it("explains missing tokenized share configuration without inventing a lock", () => {
  state.asset = { ...state.asset, id: 7, token: { id: 42 } };
  render(<EditAssetPage />);

  expect(screen.getByText(/share configuration is missing/i)).toBeVisible();
  expect(screen.getByLabelText(/asset name/i)).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Total shares")).not.toHaveAttribute("readonly");
});
