import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicFooter } from "./public-footer";

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => session.current,
}));

describe("PublicFooter navigation", () => {
  beforeEach(() => {
    session.current = { ready: true, isAuthenticated: false };
  });

  it("offers anonymous account links and keeps the logo linked home", () => {
    render(<PublicFooter />);
    expect(screen.getByRole("link", { name: "Tooken home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(
      screen.getByRole("link", { name: "Open an account" }),
    ).toHaveAttribute("href", "/sign-up");
    expect(
      screen.getByRole("link", { name: "For issuers & asset managers" }),
    ).toHaveAttribute("href", "/#institutions");
  });

  it("shows investor destinations without account creation or Institutions", () => {
    session.current = {
      ready: true,
      isAuthenticated: true,
      role: "USER",
      isStaff: false,
    };
    render(<PublicFooter />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Watchlist" })).toHaveAttribute(
      "href",
      "/favorites",
    );
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "For issuers & asset managers" }),
    ).not.toBeInTheDocument();
  });

  it.each(["MANAGER", "ADMIN"])(
    "shows back-office destinations to %s",
    (role) => {
      session.current = {
        ready: true,
        isAuthenticated: true,
        role,
        isStaff: true,
      };
      render(<PublicFooter />);
      expect(screen.getByRole("link", { name: "Back office" })).toHaveAttribute(
        "href",
        "/admin",
      );
      expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
        "href",
        "/profile",
      );
      expect(
        screen.getByRole("link", { name: "For issuers & asset managers" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Open an account" }),
      ).not.toBeInTheDocument();
    },
  );

  it("does not flash anonymous account links before the session is ready", () => {
    session.current = { ready: false, isAuthenticated: false };
    render(<PublicFooter />);
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open an account" }),
    ).not.toBeInTheDocument();
  });
});
