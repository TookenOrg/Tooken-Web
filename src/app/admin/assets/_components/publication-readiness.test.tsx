import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { RealEstate } from "@/lib/api/types";
import { PublicationReadiness } from "./publication-readiness";

const state = vi.hoisted(() => ({
  issuer: {
    data: { id: 8, name: "Example issuer", status: "active" },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock("@/lib/api/hooks", () => ({
  useIssuer: () => state.issuer,
}));

const asset: RealEstate = {
  id: 7,
  description: "An offering.",
  imageurl: "https://example.test/cover.jpg",
  issuer: { id: 8 },
  configuration: {
    total_shares: "100",
    price_per_share: "10",
    currency_code: "EUR",
    payment_frequency: 4,
    payment_frequency_type_id: 5,
  },
};

beforeEach(() => {
  state.issuer.isError = false;
  state.issuer.refetch.mockClear();
});

it("does not turn optional fee and yield labels into publication requirements", () => {
  const { rerender } = render(
    <PublicationReadiness
      asset={asset}
      missingFields={[]}
      publicationFailed={false}
    />,
  );
  expect(screen.getByText("Ready for review")).toBeInTheDocument();
  expect(screen.queryByText(/Entry fee/)).not.toBeInTheDocument();
  expect(screen.getByText(/not a publication verdict/)).toBeInTheDocument();

  rerender(
    <PublicationReadiness
      asset={asset}
      missingFields={["configuration.entry_fee_rate"]}
      publicationFailed
    />,
  );
  expect(screen.queryByText("Ready for review")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Entry fee" })).toHaveAttribute(
    "href",
    "/admin/assets/7/edit#configuration",
  );
});

it("treats a failed issuer refresh as unknown and offers retry", () => {
  state.issuer.isError = true;
  render(
    <PublicationReadiness
      asset={asset}
      missingFields={[]}
      publicationFailed={false}
    />,
  );
  expect(
    screen.getByText("Current issuer status is unavailable."),
  ).toBeInTheDocument();
  expect(screen.queryByText("Ready for review")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry issuer status" }));
  expect(state.issuer.refetch).toHaveBeenCalledOnce();
});
