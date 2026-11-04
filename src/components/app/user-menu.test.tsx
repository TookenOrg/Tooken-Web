import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "./user-menu";

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({
    ready: true,
    role: "USER",
    isInvestor: true,
    isStaff: false,
    user: { full_name: "Claire Investor", email: "claire@invest.lu" },
  }),
}));

describe("UserMenu", () => {
  it("shows the role inside the opened menu", () => {
    render(<UserMenu />);
    fireEvent.pointerDown(screen.getByRole("button"), {
      button: 0,
      ctrlKey: false,
    });
    const menu = screen.getByRole("menu");
    expect(menu).toHaveTextContent("Claire Investor");
    expect(within(menu).getByText("Investor")).toBeInTheDocument();
    expect(menu).toHaveTextContent("claire@invest.lu");
  });
});
