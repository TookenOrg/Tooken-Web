import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import AssetDetailPage from "./page";

const state = vi.hoisted(() => ({
  outcome: "missing" as "missing" | "unexpected" | "published",
  publish: vi.fn(),
  refetch: vi.fn(),
  invalidate: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "7" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: state.invalidate }),
}));
vi.mock("sonner", () => ({
  toast: {
    success: state.success,
    warning: state.warning,
    error: vi.fn(),
  },
}));
vi.mock("@/lib/api/hooks", () => ({
  queryKeys: { issuer: (id: number) => ["issuers", id] },
  useRealEstate: () => ({
    data: {
      id: 7,
      title: "Test asset",
      status: "draft",
      description: "Description",
      imageurl: "https://example.test/image.jpg",
      issuer: { id: 8, name: "Issuer", status: "active" },
      configuration: {
        total_shares: "100",
        price_per_share: "10",
        currency_code: "EUR",
        payment_frequency: 4,
        payment_frequency_type_id: 5,
      },
    },
    isLoading: false,
    isError: false,
    refetch: state.refetch,
  }),
  useIssuer: () => ({
    data: { id: 8, name: "Issuer", status: "active" },
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
  usePublishRealEstate: () => {
    const [error, setError] = useState<unknown>(null);
    return {
      error,
      isError: !!error,
      isPending: false,
      reset: () => setError(null),
      mutate: (
        id: number,
        options: {
          onError: (error: unknown) => void;
          onSuccess: (result: { status: string }) => void;
        },
      ) => {
        state.publish(id);
        if (state.outcome === "missing") {
          const failure = new ApiError(409, "Complete the asset", undefined, [
            "configuration.entry_fee_rate",
          ]);
          setError(failure);
          options.onError(failure);
        } else {
          options.onSuccess({
            status: state.outcome === "published" ? "published" : "draft",
          });
        }
      },
    };
  },
  useOpenFundraising: () => ({
    isPending: false,
    isError: false,
    reset: vi.fn(),
  }),
  useDeleteRealEstate: () => ({ isPending: false }),
  useOrders: () => ({ data: [], isLoading: false, isError: false }),
  useTokenInfos: () => ({ isLoading: false, isError: false }),
}));
vi.mock("@/components/app/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    description,
    confirmLabel,
    onConfirm,
  }: {
    open: boolean;
    title: React.ReactNode;
    description: React.ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={String(title)}>
        {description}
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

beforeEach(() => {
  state.outcome = "missing";
  state.publish.mockClear();
  state.refetch.mockClear();
  state.invalidate.mockClear();
  state.success.mockClear();
  state.warning.mockClear();
});

it("explains confirmed consequences and retains server missing-field links", async () => {
  render(<AssetDetailPage />);
  fireEvent.click(screen.getByRole("button", { name: "Publish & tokenize" }));
  expect(
    screen.getByText(/per-investor share cap are fixed/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Opening fundraising is a separate decision/),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Publish & deploy token" }),
  );
  await waitFor(() => expect(state.publish).toHaveBeenCalledWith(7));
  expect(screen.getAllByRole("link", { name: "Entry fee" })[0]).toHaveAttribute(
    "href",
    "/admin/assets/7/edit#configuration",
  );
  expect(state.refetch).toHaveBeenCalled();
  expect(state.invalidate).toHaveBeenCalledWith({ queryKey: ["issuers", 8] });
  expect(state.success).not.toHaveBeenCalled();
});

it("does not claim success when the returned status is not published", () => {
  state.outcome = "unexpected";
  render(<AssetDetailPage />);
  fireEvent.click(screen.getByRole("button", { name: "Publish & tokenize" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Publish & deploy token" }),
  );
  expect(state.success).not.toHaveBeenCalled();
  expect(state.warning).toHaveBeenCalled();
  expect(state.refetch).toHaveBeenCalled();
});
