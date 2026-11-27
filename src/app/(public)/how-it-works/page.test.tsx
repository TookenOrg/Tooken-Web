import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HowItWorksPage from "./page";

describe("HowItWorksPage", () => {
  beforeEach(() => {
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

  it("renders the four core visual sections and marketplace CTAs", () => {
    render(<HowItWorksPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /From a real building to verified on-chain shares/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Built for regulated assets, not anonymous speculation.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Two layers, each doing what it does best.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Two on-chain gatekeepers on every transaction.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Tokenization, token emission, and the mint.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /Explore the marketplace/i }),
    ).toHaveAttribute("href", "/explore");
  });

  it("simulates ERC-3643 blocking an unverified wallet and approving a verified investor", () => {
    render(<HowItWorksPage />);

    expect(screen.getByText(/Blocked on-chain:/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /KYC-verified investor/i }),
    );
    expect(screen.getByText(/Approved on-chain:/i)).toBeInTheDocument();
  });

  it("switches off-chain vs on-chain synchronization bridges interactively", () => {
    render(<HowItWorksPage />);

    const flowGroup = screen.getByRole("group", {
      name: "Off-chain and on-chain synchronization flows",
    });

    fireEvent.click(
      within(flowGroup).getByRole("button", { name: /Sync investor KYC/i }),
    );
    expect(
      screen.getByText(/Bridge 02 — Sync investor KYC:/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Identity documents stay private off-chain/i),
    ).toBeInTheDocument();

    fireEvent.click(
      within(flowGroup).getByRole("button", { name: /Confirm delivery/i }),
    );
    expect(
      screen.getByText(/Bridge 04 — Confirm delivery:/i),
    ).toBeInTheDocument();
  });

  it("simulates all three ERC-3643 gatekeeper scenarios and contract inspection", () => {
    render(<HowItWorksPage />);

    expect(screen.getByText("PRIMARY MINT APPROVED")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Wallet without KYC claim" }),
    );
    expect(
      screen.getByText("REVERTED BY IDENTITY REGISTRY"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Verified investor · above max cap" }),
    );
    expect(
      screen.getByText("REVERTED BY MODULAR COMPLIANCE"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "IdentityRegistryStorage" }),
    );
    expect(
      screen.getByText(
        /Stores the wallet → OnchainID link and numeric ISO country code/i,
      ),
    ).toBeInTheDocument();
  });

  it("walks through tokenization, token emission (0 supply), and on-chain minting", () => {
    render(<HowItWorksPage />);

    const actGroup = screen.getByRole("group", {
      name: "Token lifecycle stages",
    });

    // Act 1 starts at Step 1.1
    expect(
      screen.getByText("Draft offering · 25,000 target shares"),
    ).toBeInTheDocument();

    // Jump to Act 2: Token emission
    fireEvent.click(
      within(actGroup).getByRole("button", { name: /Token emission/i }),
    );
    expect(
      screen.getByText("Broadcasting TREXFactory deployment…"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Step 2\.3.*Publish suite \(0 supply\), then open fundraising/i,
      }),
    );
    expect(
      screen.getByText("Published · Supply: 0 / 25,000 shares"),
    ).toBeInTheDocument();

    // Jump to Act 3: On-chain mint and advance to final delivery step
    fireEvent.click(
      within(actGroup).getByRole("button", { name: /On-chain mint/i }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Step 3\.4.*Credit shares & confirm Transfer receipt/i,
      }),
    );
    expect(
      screen.getByText("Delivered · Supply: 50 / 25,000 shares"),
    ).toBeInTheDocument();
    expect(screen.getByText("+50 Shares")).toBeInTheDocument();
  });

  it("keeps diagrams static when prefers-reduced-motion is enabled and supports manual pause/play", () => {
    vi.useFakeTimers();
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    const { container } = render(<HowItWorksPage />);

    expect(
      screen.getByText("Draft offering · 25,000 target shares"),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".motion-paused").length).toBeGreaterThan(
      0,
    );

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    // Neither the storyboard nor the hero bridge auto-advances under reduced motion.
    expect(
      screen.getByText("Draft offering · 25,000 target shares"),
    ).toBeInTheDocument();

    // Explicit opt-in via Play all button enables CSS motion-opt-in and advances steps.
    fireEvent.click(screen.getByRole("button", { name: /Play all/i }));
    expect(container.querySelectorAll(".motion-opt-in").length).toBe(1);
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(
      screen.getByText("Caps locked · Max 2,500 / identity"),
    ).toBeInTheDocument();
  });
});
