import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HashValue } from "./hash-value";

const ADDRESS = "0x0059acCa9E938a97158c9676d776BCFc1f717bfA";
const TX_HASH =
  "0x8f4e2a0c1d3b5e7a9f0c2d4e6b8a0c1d3e5f7a9b1c3d5e7f9a0b2c4d6e8f0a1b";

describe("HashValue", () => {
  it("links 0x addresses to Sepolia Etherscan and copies the raw address", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<HashValue value={ADDRESS} />);

    const link = screen.getByRole("link", { name: "0x0059ac…717bfA" });
    expect(link).toHaveAttribute(
      "href",
      `https://sepolia.etherscan.io/address/${ADDRESS}`,
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ADDRESS));
  });

  it("links 66-character 0x hashes to Sepolia transactions unless disabled", () => {
    const { rerender } = render(<HashValue value={TX_HASH} />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `https://sepolia.etherscan.io/tx/${TX_HASH}`,
    );

    rerender(<HashValue value={TX_HASH} explorerKind="none" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy to clipboard" }),
    ).toBeInTheDocument();
  });

  it("renders non-hex references as plain text with a copy button", () => {
    render(<HashValue value="ORD-2026-0001" full />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("ORD-2026-0001")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy to clipboard" }),
    ).toBeInTheDocument();
  });
});
