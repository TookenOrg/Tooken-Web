import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import IssuersPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/api/hooks", () => ({
  useIssuers: () => ({
    data: [
      {
        id: 1,
        name: "Active vehicle",
        legal_form: "SA",
        country_code: "LU",
        registration_number: "B123",
        status: "active",
      },
      {
        id: 2,
        name: "Former vehicle",
        legal_form: "GmbH",
        country_code: "DE",
        lei_code: "12345678901234567890",
        status: "dissolved",
      },
    ],
    isLoading: false,
    isError: false,
    isSuccess: true,
  }),
}));

it("filters dissolved issuers, counts results and resets search and status", () => {
  render(<IssuersPage />);
  fireEvent.click(screen.getByRole("button", { name: /Dissolved 1/ }));
  expect(screen.getByText("1 of 2 issuers")).toBeInTheDocument();
  expect(screen.getAllByText("Former vehicle").length).toBeGreaterThan(0);
  expect(screen.queryByText("Active vehicle")).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search issuers" }), {
    target: { value: "not found" },
  });
  expect(screen.getByText("0 of 2 issuers")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(screen.getByText("2 issuers")).toBeInTheDocument();
  expect(screen.getAllByText("Active vehicle").length).toBeGreaterThan(0);
});
