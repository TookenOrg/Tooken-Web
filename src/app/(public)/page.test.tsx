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

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/lib/api/hooks", () => ({
  useRealEstates: () => query,
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => session.current,
}));

vi.mock("@/components/app/favorite-button", () => ({
  FavoriteButton: () => null,
}));

describe("LandingPage asset spotlight", () => {
  beforeEach(() => {
    query.data = [];
    query.isError = false;
    session.current = { ready: true, isAuthenticated: false };
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

  it("pauses while keyboard focus is inside the carousel", () => {
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
    const carousel = within(
      screen.getByRole("figure", { name: "Featured assets" }),
    );
    const link = carousel.getByRole("link", { name: "View River House" });
    fireEvent.focus(link);
    act(() => vi.advanceTimersByTime(12000));
    expect(link).toBeInTheDocument();
    fireEvent.blur(link, { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(8000));
    expect(
      carousel.getByRole("link", { name: "View Garden House" }),
    ).toBeInTheDocument();
  });

  it("keeps currencies separate and marks incomplete valuations", () => {
    query.data = [
      {
        id: 1,
        status: "fundraising",
        configuration: { currency_code: "EUR", total_valuation: "100" },
      },
      {
        id: 2,
        status: "published",
        configuration: { currency_code: "USD", total_valuation: "200" },
      },
      { id: 3, status: "published", configuration: { total_valuation: "50" } },
    ];
    render(<LandingPage />);
    const value = screen.getByText(
      "Known listed asset values",
    ).nextElementSibling;
    expect(value).toHaveTextContent("€100");
    expect(value).toHaveTextContent("US$200");
    expect(value).not.toHaveTextContent("€150");
  });

  it.each([
    ["USER", false, "Dashboard", "/dashboard"],
    ["MANAGER", true, "Back office", "/admin"],
  ] as const)(
    "directs a signed-in %s to their workspace",
    (role, isStaff, label, href) => {
      session.current = { ready: true, isAuthenticated: true, role, isStaff };
      render(<LandingPage />);
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
      expect(
        screen.queryByRole("link", { name: "Open an account" }),
      ).not.toBeInTheDocument();
    },
  );

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
