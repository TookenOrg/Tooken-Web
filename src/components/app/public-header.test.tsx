import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicHeader } from "./public-header";

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => session.current,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/explore",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function openMenu() {
  render(<PublicHeader />);
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  return screen.getByRole("dialog");
}

describe("PublicHeader mobile menu", () => {
  beforeEach(() => {
    session.current = {};
  });

  it("shows the signed-in account name and role", () => {
    session.current = {
      ready: true,
      isAuthenticated: true,
      role: "MANAGER",
      isStaff: true,
      user: { full_name: "Jane Doe" },
    };
    const dialog = openMenu();
    expect(dialog).toHaveTextContent("Jane Doe");
    expect(dialog).toHaveTextContent("Asset manager");
  });

  it("hides the account summary when signed out", () => {
    session.current = { ready: true, isAuthenticated: false };
    const dialog = openMenu();
    expect(dialog).toHaveTextContent("Sign in");
    expect(dialog).not.toHaveTextContent("Member");
  });
});
