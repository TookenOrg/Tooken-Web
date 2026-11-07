import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RealEstate, RealEstateSummary } from "@/lib/api/types";
import ExplorePage from "./page";

const state = vi.hoisted(() => ({
  list: {
    data: [] as RealEstateSummary[] | undefined,
    isLoading: false,
    isError: false,
    error: new Error("Catalogue unavailable"),
    refetch: vi.fn(),
  },
  get: vi.fn<(id: number) => Promise<RealEstate>>(),
}));

vi.mock("@/lib/api/hooks", () => ({
  useRealEstates: () => state.list,
  queryKeys: { realEstate: (id: number) => ["real-estates", id] },
}));

vi.mock("@/lib/api/endpoints", () => ({
  realEstateApi: { get: state.get },
}));

vi.mock("@/components/app/favorite-button", () => ({
  FavoriteButton: () => null,
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ExplorePage />
    </QueryClientProvider>,
  );
}

function titles() {
  return screen
    .getAllByRole("article")
    .map((card) => within(card).getByRole("heading").textContent);
}

async function selectOption(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), {
    key: "ArrowDown",
  });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

describe("Explore catalogue", () => {
  beforeEach(() => {
    state.list.data = [];
    state.list.isLoading = false;
    state.list.isError = false;
    state.list.refetch.mockReset();
    state.get.mockReset();
    state.get.mockImplementation(async (id) => ({ id }));
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("orders open offerings first by publication date, with invalid or missing dates last and stable ties", async () => {
    state.list.data = [
      {
        id: 9,
        title: "Open without date",
        status: "fundraising",
        created_at: "2035-01-01",
      },
      {
        id: 4,
        title: "Open older",
        status: "fundraising",
        created_at: "2034-01-01",
      },
      { id: 7, title: "Closed newest", status: "closed" },
      { id: 3, title: "Open tie B", status: "fundraising" },
      { id: 1, title: "Open tie A", status: "fundraising" },
      { id: 8, title: "Open invalid date", status: "fundraising" },
    ];
    const dates: Record<number, string | undefined> = {
      1: "2026-09-10T00:00:00Z",
      3: "2026-09-10T00:00:00Z",
      4: "2026-01-01T00:00:00Z",
      7: "2030-01-01T00:00:00Z",
      8: "not-a-date",
    };
    state.get.mockImplementation(async (id) => ({
      id,
      published_at: dates[id],
    }));
    renderPage();
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(6));
    expect(titles()).toEqual([
      "Open tie A",
      "Open tie B",
      "Open older",
      "Open invalid date",
      "Open without date",
      "Closed newest",
    ]);
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Open first, newest published",
    );
  });

  it("keeps an unknown yield distinct from zero when sorting and filtering", async () => {
    state.list.data = [
      { id: 1, title: "Unknown", status: "fundraising", configuration: {} },
      {
        id: 2,
        title: "Zero",
        status: "fundraising",
        configuration: { yield: 0 },
      },
      {
        id: 3,
        title: "Positive",
        status: "fundraising",
        configuration: { yield: 4 },
      },
    ];
    renderPage();
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
    await selectOption("Sort by", "Highest yield");
    expect(titles()).toEqual(["Positive", "Zero", "Unknown"]);
    const zero = screen.getByRole("link", { name: "Zero" }).closest("article");
    const unknown = screen
      .getByRole("link", { name: "Unknown" })
      .closest("article");
    expect(
      within(zero as HTMLElement).getByText("Yield").nextElementSibling,
    ).toHaveTextContent("0.00 %");
    expect(
      within(unknown as HTMLElement).getByText("Yield").nextElementSibling,
    ).toHaveTextContent("—");

    fireEvent.click(screen.getByRole("button", { name: "Yield: any" }));
    const sliders = screen.getAllByRole("slider");
    fireEvent.focus(sliders[1]);
    fireEvent.keyDown(sliders[1], { key: "ArrowLeft" });
    await waitFor(() => expect(titles()).toEqual(["Positive", "Zero"]));
    expect(
      screen.getByRole("button", { name: /Remove Yield:/ }),
    ).toBeInTheDocument();
  });

  it("sorts exact decimal prices within currencies and leaves missing prices last", async () => {
    state.list.data = [
      {
        id: 1,
        title: "Higher EUR",
        status: "published",
        configuration: {
          currency_code: "EUR",
          price_per_share: "10000000000.00000002",
        },
      },
      {
        id: 2,
        title: "USD",
        status: "published",
        configuration: { currency_code: "USD", price_per_share: "1.25" },
      },
      {
        id: 3,
        title: "Lower EUR",
        status: "published",
        configuration: {
          currency_code: "EUR",
          price_per_share: "10000000000.00000001",
        },
      },
      { id: 4, title: "Missing price", status: "published" },
    ];
    renderPage();
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(4));
    await selectOption("Sort by", "Price: low to high by currency");
    expect(titles()).toEqual([
      "Lower EUR",
      "Higher EUR",
      "USD",
      "Missing price",
    ]);
    await selectOption("Sort by", "Price: high to low by currency");
    expect(titles()).toEqual([
      "Higher EUR",
      "Lower EUR",
      "USD",
      "Missing price",
    ]);
  });

  it("does not display an assumed currency on an offering", async () => {
    state.list.data = [
      {
        id: 1,
        title: "Unknown currency",
        status: "published",
        configuration: { price_per_share: "12" },
      },
    ];
    renderPage();
    const card = await screen.findByRole("article");
    expect(within(card).getByText("Currency unavailable")).toBeVisible();
    expect(card).not.toHaveTextContent("€12");
  });

  it("removes individual filters and clears an empty result without resetting the sort", async () => {
    state.list.data = [
      { id: 1, title: "River House", status: "fundraising" },
      { id: 2, title: "Garden House", status: "fundraising" },
      { id: 3, title: "Closed House", status: "closed" },
    ];
    renderPage();
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
    await selectOption("Sort by", "Highest yield");
    await selectOption("Status", "Open for subscription");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search offerings" }),
      {
        target: { value: "River" },
      },
    );
    expect(titles()).toEqual(["River House"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Search: River filter" }),
    );
    expect(titles()).toEqual(["River House", "Garden House"]);
    expect(
      screen.getByRole("button", {
        name: "Remove Status: Open for subscription filter",
      }),
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search offerings" }),
      {
        target: { value: "No match" },
      },
    );
    expect(
      screen.getByText("No offering matches your criteria"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Clear filters" })[0],
    );
    expect(titles()).toEqual(["River House", "Garden House", "Closed House"]);
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Highest yield",
    );
  });

  it("reports failed publication dates and retries them without losing offerings", async () => {
    state.list.data = [
      { id: 1, title: "Retry date", status: "fundraising" },
      { id: 2, title: "Known date", status: "fundraising" },
    ];
    let attempts = 0;
    state.get.mockImplementation(async (id) => {
      if (id === 1 && attempts++ === 0) throw new Error("Date unavailable");
      return { id, published_at: id === 1 ? "2026-06-01" : "2026-01-01" };
    });
    renderPage();
    expect(
      await screen.findByText(/Some publication dates could not be loaded/),
    ).toBeInTheDocument();
    expect(titles()).toEqual(["Known date", "Retry date"]);
    fireEvent.click(screen.getByRole("button", { name: "Retry dates" }));
    await waitFor(() => expect(titles()).toEqual(["Retry date", "Known date"]));
  });

  it("shows a recoverable catalogue error rather than zero offerings", () => {
    state.list.data = undefined;
    state.list.isError = true;
    renderPage();
    expect(screen.getByText("Offerings unavailable")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(state.list.refetch).toHaveBeenCalledOnce();
  });
});
