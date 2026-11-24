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
    query.isLoading = false;
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

  it("shows the default presentation photo without Open for subscription badge when no fundraising offering is available", () => {
    vi.useFakeTimers();
    query.data = [
      {
        id: 1,
        title: "Future offering",
        status: "published",
        imageurl: "/future.jpg",
      },
    ];
    render(<LandingPage />);
    const figure = screen.getByRole("figure", { name: "Featured assets" });
    act(() => vi.advanceTimersByTime(12000));
    expect(
      within(figure).getByRole("img", {
        name: "Contemporary architectural facade",
      }),
    ).toBeInTheDocument();
    expect(
      within(figure).getByText("RWA / REAL-WORLD ASSETS"),
    ).toBeInTheDocument();
    expect(
      within(figure).queryByText("Open for subscription"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Not an investment offering/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /View featured asset/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the default presentation photo in the hero while showing a loader below Explore the underlying assets", () => {
    query.isLoading = true;
    render(<LandingPage />);
    const figure = screen.getByRole("figure", { name: "Featured assets" });
    expect(
      within(figure).getByRole("img", {
        name: "Contemporary architectural facade",
      }),
    ).toBeInTheDocument();
    expect(
      within(figure).queryByText("Open for subscription"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Loading featured offerings…"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Loading offerings…")).toBeInTheDocument();
  });

  it("finishes the presentation photo slot when data arrives after 1s, then cycles strictly between fundraising offerings", () => {
    vi.useFakeTimers();
    query.isLoading = true;
    const { rerender } = render(<LandingPage />);
    const figure = screen.getByRole("figure", { name: "Featured assets" });
    expect(
      within(figure).getByRole("img", {
        name: "Contemporary architectural facade",
      }),
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    query.isLoading = false;
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
      {
        id: 3,
        title: "Harbor Loft",
        status: "fundraising",
        imageurl: "/harbor.jpg",
      },
      { id: 4, title: "No photo", status: "fundraising" },
    ];
    rerender(<LandingPage />);

    // At 1s (and up to 7.9s), the presentation photo continues smoothly without jumping.
    expect(
      within(figure).getByRole("img", {
        name: "Contemporary architectural facade",
      }),
    ).toBeInTheDocument();
    expect(
      within(figure).queryByText("Open for subscription"),
    ).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(6900));
    expect(
      within(figure).getByRole("img", {
        name: "Contemporary architectural facade",
      }),
    ).toBeInTheDocument();

    // At 8s total since page arrival, it transitions to the first fundraising offering.
    act(() => vi.advanceTimersByTime(100));
    expect(
      within(figure).queryByRole("img", {
        name: "Contemporary architectural facade",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(figure).queryByAltText("Future offering"),
    ).not.toBeInTheDocument();
    expect(
      within(figure).getByRole("img", { name: "River House" }),
    ).toBeInTheDocument();
    expect(
      within(figure).getByText("Open for subscription"),
    ).toBeInTheDocument();
    expect(
      within(figure).getByRole("link", { name: "View River House" }),
    ).toHaveAttribute("href", "/real-estate/2");
    expect(within(figure).getByText("Luxembourg")).toBeInTheDocument();

    // Subsequent 8s intervals cycle strictly through fundraising offerings.
    act(() => vi.advanceTimersByTime(8000));
    expect(
      within(figure).getByRole("link", { name: "View Harbor Loft" }),
    ).toHaveAttribute("href", "/real-estate/3");

    act(() => vi.advanceTimersByTime(8000));
    expect(
      within(figure).getByRole("link", { name: "View River House" }),
    ).toHaveAttribute("href", "/real-estate/2");
    expect(
      within(figure).queryByRole("img", {
        name: "Contemporary architectural facade",
      }),
    ).not.toBeInTheDocument();
  });

  it("transitions from the presentation photo to a single fundraising offering and stays on it", () => {
    vi.useFakeTimers();
    query.data = [
      {
        id: 1,
        title: "River House",
        status: "fundraising",
        imageurl: "/river.jpg",
      },
    ];
    render(<LandingPage />);
    const carousel = within(
      screen.getByRole("figure", { name: "Featured assets" }),
    );
    expect(carousel.queryByRole("button")).not.toBeInTheDocument();
    expect(
      carousel.getByRole("img", {
        name: "Contemporary architectural facade",
      }),
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(8000));
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toHaveAttribute("href", "/real-estate/1");

    act(() => vi.advanceTimersByTime(16000));
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toHaveAttribute("href", "/real-estate/1");
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

  it("hides navigation controls in the hero carousel", () => {
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

  it("still transitions out of the presentation photo if hovered on arrival, then pauses on the offering while hovered", () => {
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
        title: "Harbor Loft",
        status: "fundraising",
        imageurl: "/harbor.jpg",
      },
    ];
    render(<LandingPage />);
    const figure = screen.getByRole("figure", { name: "Featured assets" });
    const carousel = within(figure);
    fireEvent.mouseEnter(figure);
    act(() => vi.advanceTimersByTime(8000));
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(12000));
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toBeInTheDocument();
    fireEvent.mouseLeave(figure);
    act(() => vi.advanceTimersByTime(8000));
    expect(
      carousel.getByRole("link", { name: "View Harbor Loft" }),
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
        title: "Harbor Loft",
        status: "fundraising",
        imageurl: "/harbor.jpg",
      },
    ];
    render(<LandingPage />);
    const carousel = within(
      screen.getByRole("figure", { name: "Featured assets" }),
    );
    act(() => vi.advanceTimersByTime(8000));
    const link = carousel.getByRole("link", { name: "View River House" });
    fireEvent.focus(link);
    act(() => vi.advanceTimersByTime(12000));
    expect(link).toBeInTheDocument();
    fireEvent.blur(link, { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(8000));
    expect(
      carousel.getByRole("link", { name: "View Harbor Loft" }),
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
        title: "Harbor Loft",
        status: "fundraising",
        imageurl: "/harbor.jpg",
      },
    ];
    render(<LandingPage />);
    const carousel = within(
      screen.getByRole("figure", { name: "Featured assets" }),
    );
    act(() => vi.advanceTimersByTime(8000));
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(16000));
    expect(
      carousel.getByRole("link", { name: "View River House" }),
    ).toBeInTheDocument();
    expect(
      carousel.queryByRole("link", { name: "View Harbor Loft" }),
    ).not.toBeInTheDocument();
    expect(
      carousel.queryByRole("button", { name: "Pause slideshow" }),
    ).not.toBeInTheDocument();
  });
});
