import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "./page";

const query = vi.hoisted(() => ({
  data: [] as Record<string, unknown>[],
  isLoading: false,
  isError: false,
  error: new Error("Unable to connect"),
  refetch: vi.fn(),
}));

vi.mock("@/lib/api/hooks", () => ({
  useRealEstates: () => query,
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({ ready: true, isAuthenticated: false }),
}));

vi.mock("@/components/app/favorite-button", () => ({
  FavoriteButton: () => null,
}));

describe("LandingPage asset spotlight", () => {
  beforeEach(() => {
    query.data = [];
    query.isError = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a platform overview without inventing an offering when no photo is available", () => {
    render(<LandingPage />);
    expect(screen.getByText("RWA / REAL-WORLD ASSETS")).toBeInTheDocument();
    expect(screen.getByText(/Not an investment offering/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /View featured asset/ }),
    ).not.toBeInTheDocument();
  });

  it("features an open subscription before a published offering and links to the real asset", () => {
    query.data = [
      {
        id: 1,
        title: "Future offering",
        status: "published",
        imageurl: "/future.jpg",
      },
      {
        id: 2,
        title: "River House",
        status: "fundraising",
        imageurl: "/river.jpg",
        location: { city: "Luxembourg" },
      },
    ];
    render(<LandingPage />);
    const figure = screen.getByRole("figure");
    expect(within(figure).getByAltText("River House")).toBeInTheDocument();
    expect(
      within(figure).getByRole("link", { name: "View River House" }),
    ).toHaveAttribute("href", "/real-estate/2");
    expect(within(figure).getByText("Luxembourg")).toBeInTheDocument();
  });

  it("does not display successful portfolio metrics when the API fails", () => {
    query.isError = true;
    render(<LandingPage />);
    for (const label of [
      "Listed offerings",
      "Total listed asset value",
      "Open for subscription",
    ]) {
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent("—");
    }
    expect(screen.getByRole("button", { name: /Retry/ })).toBeInTheDocument();
  });

  it("cycles through photographed assets without displaying controls", () => {
    vi.useFakeTimers();
    query.data = [
      {
        id: 1,
        title: "River House",
        status: "fundraising",
        imageurl: "/river.jpg",
      },
      {
        id: 2,
        title: "Garden House",
        status: "published",
        imageurl: "/garden.jpg",
      },
      { id: 3, title: "No photo", status: "published" },
    ];
    render(<LandingPage />);
    const carousel = within(
      screen.getByRole("figure", { name: "Featured assets" }),
    );
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toHaveAttribute("href", "/real-estate/1");
    expect(carousel.queryByRole("button")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(8000));
    expect(carousel.getByAltText("Garden House")).toBeInTheDocument();
    expect(
      carousel.getByRole("link", { name: "View Garden House" }),
    ).toHaveAttribute("href", "/real-estate/2");
    act(() => vi.advanceTimersByTime(8000));
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toBeInTheDocument();
  });

  it("hides navigation when only one asset has a photo", () => {
    query.data = [
      {
        id: 1,
        title: "River House",
        status: "fundraising",
        imageurl: "/river.jpg",
      },
    ];
    render(<LandingPage />);
    expect(
      screen.queryByRole("button", { name: "Next featured asset" }),
    ).not.toBeInTheDocument();
  });

  it("rotates automatically and pauses on hover", () => {
    vi.useFakeTimers();
    query.data = [
      {
        id: 1,
        title: "River House",
        status: "fundraising",
        imageurl: "/river.jpg",
      },
      {
        id: 2,
        title: "Garden House",
        status: "published",
        imageurl: "/garden.jpg",
      },
    ];
    render(<LandingPage />);
    const figure = screen.getByRole("figure", { name: "Featured assets" });
    const carousel = within(figure);
    act(() => vi.advanceTimersByTime(8000));
    expect(
      carousel.getByRole("link", { name: "View Garden House" }),
    ).toBeInTheDocument();
    fireEvent.mouseEnter(figure);
    act(() => vi.advanceTimersByTime(12000));
    expect(
      carousel.getByRole("link", { name: "View Garden House" }),
    ).toBeInTheDocument();
    fireEvent.mouseLeave(figure);
    act(() => vi.advanceTimersByTime(8000));
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toBeInTheDocument();
  });

  it("does not rotate automatically when reduced motion is requested", () => {
    vi.useFakeTimers();
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    query.data = [
      {
        id: 1,
        title: "River House",
        status: "fundraising",
        imageurl: "/river.jpg",
      },
      {
        id: 2,
        title: "Garden House",
        status: "published",
        imageurl: "/garden.jpg",
      },
    ];
    render(<LandingPage />);
    const carousel = within(
      screen.getByRole("figure", { name: "Featured assets" }),
    );
    act(() => vi.advanceTimersByTime(12000));
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toBeInTheDocument();
    expect(
      carousel.queryByRole("button", { name: "Pause slideshow" }),
    ).not.toBeInTheDocument();
  });
});
