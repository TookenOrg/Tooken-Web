import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProjectPage from "./page";

describe("ProjectPage", () => {
  it("presents what Tooken is, its MVP scope, and Antony LEFEVRE", () => {
    render(<ProjectPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Behind Tooken." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "A full-lifecycle tokenization platform.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Real engineering. Illustrative offerings.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Antony LEFEVRE" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Senior Backend & Blockchain Software Engineer/),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/antonylefevre/",
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/Antopablo",
    );
    expect(
      screen.getByRole("link", { name: /Explore the marketplace/i }),
    ).toHaveAttribute("href", "/explore");
    expect(screen.getByRole("link", { name: /Back to home/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
