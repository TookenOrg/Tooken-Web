import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MvpBanner } from "./mvp-banner";

const currentPath = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => currentPath.value,
}));

describe("MvpBanner", () => {
  beforeEach(() => {
    currentPath.value = "/";
  });

  it("explains that Tooken is an MVP and links to /project on public pages", () => {
    render(<MvpBanner />);
    const notice = screen.getByRole("complementary", {
      name: "MVP project notice",
    });
    expect(notice).toHaveTextContent(/Tooken is an independent technical MVP/i);
    expect(notice).toHaveTextContent(/Antony LEFEVRE/);
    expect(
      screen.getByRole("link", { name: /About the project & author/i }),
    ).toHaveAttribute("href", "/project");
  });

  it("hides itself on /project to avoid a redundant self-link", () => {
    currentPath.value = "/project";
    const { container } = render(<MvpBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
