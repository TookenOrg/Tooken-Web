import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/client";
import { decideRoute } from "@/lib/auth/routes";
import PlatformPage from "./page";

const state = vi.hoisted(() => ({
  suiteData: {} as unknown,
  suitePending: false,
  suiteError: null as Error | null,
  suiteRefetch: vi.fn(),
  suiteArgs: vi.fn(),
  catalogueError: false,
  catalogueRefetch: vi.fn(),
  platform: {
    deployImplementations: vi.fn(),
    deployIdentityFactory: vi.fn(),
    configureAuthority: vi.fn(),
    deployTrexFactory: vi.fn(),
    deploySuite: vi.fn(),
  },
  contract: {
    createIdentity: vi.fn(),
    addClaim: vi.fn(),
    createToken: vi.fn(),
    burn: vi.fn(),
  },
}));

vi.mock("@/lib/api/endpoints", () => ({
  platformApi: state.platform,
  contractApi: state.contract,
}));

vi.mock("@/lib/api/hooks", () => ({
  useTrexSuite: (salt?: string) => {
    state.suiteArgs(salt);
    return {
      data: state.suiteData,
      isPending: state.suitePending,
      isFetching: state.suitePending,
      isError: !!state.suiteError,
      error: state.suiteError,
      refetch: state.suiteRefetch,
    };
  },
  useRealEstates: () => ({
    data: [],
    isError: state.catalogueError,
    refetch: state.catalogueRefetch,
  }),
  useTokenInfos: () => ({
    data: null,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

function renderPlatform() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  }
  return render(<PlatformPage />, { wrapper: Wrapper });
}

async function openTokens(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Advanced operations" }));
  await user.click(screen.getByRole("tab", { name: "Tokens" }));
}

beforeEach(() => {
  state.suiteData = { message: "No details returned" };
  state.suitePending = false;
  state.suiteError = null;
  state.catalogueError = false;
  state.suiteRefetch.mockReset();
  state.suiteArgs.mockReset();
  state.catalogueRefetch.mockReset();
  for (const mock of [
    ...Object.values(state.platform),
    ...Object.values(state.contract),
  ]) {
    mock.mockReset();
  }
});

describe("blockchain platform", () => {
  it("keeps the existing ADMIN-only route decision", () => {
    expect(
      decideRoute("/admin/platform", { authenticated: true, role: "ADMIN" }),
    ).toEqual({ type: "next" });
    expect(
      decideRoute("/admin/platform", { authenticated: true, role: "MANAGER" }),
    ).toEqual({ type: "redirect", to: "/admin" });
    expect(
      decideRoute("/admin/platform", { authenticated: true, role: "USER" }),
    ).toEqual({ type: "redirect", to: "/dashboard" });
    expect(decideRoute("/admin/platform", { authenticated: false })).toEqual({
      type: "redirect",
      to: "/sign-in",
      withCallback: true,
    });
  });

  it("opens on the read-only suite lookup with unknown state and no exceptional operations", () => {
    renderPlatform();

    expect(screen.getByText("T-REX suite lookup")).toBeVisible();
    expect(screen.getByText("Network and environment: unknown.")).toBeVisible();
    expect(screen.getByText("Initialisation status: unknown.")).toBeVisible();
    expect(
      screen.getByText(/No contract addresses were returned/),
    ).toBeVisible();
    expect(screen.queryByText("Not initialised")).toBeNull();
    expect(screen.queryByRole("button", { name: "Run" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Review burn" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Deploy token" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Advanced operations" }),
    ).toHaveAttribute("aria-expanded", "false");
    const details = screen.getByText("Expert details").closest("details");
    expect(details).not.toHaveAttribute("open");
    for (const mock of [
      ...Object.values(state.platform),
      ...Object.values(state.contract),
    ]) {
      expect(mock).not.toHaveBeenCalled();
    }
  });

  it.each([404, 503])(
    "keeps lookup state unknown and offers retry after HTTP %s",
    async (status) => {
      state.suiteError = new ApiError(status, "Lookup failed");
      const user = userEvent.setup();
      renderPlatform();

      expect(screen.getByText("Suite information unavailable")).toBeVisible();
      expect(
        screen.getByText(/failed lookup does not establish/i),
      ).toBeVisible();
      expect(screen.getByText("Initialisation status: unknown.")).toBeVisible();
      expect(screen.queryByText("Suite not found")).toBeNull();
      await user.click(screen.getByRole("button", { name: "Retry" }));
      expect(state.suiteRefetch).toHaveBeenCalledOnce();
    },
  );

  it("shows returned contract addresses without inferring the network and can repeat a lookup", async () => {
    const token = `0x${"a".repeat(40)}`;
    const registry = `0x${"b".repeat(40)}`;
    state.suiteData = {
      data: {
        token: { address: token, symbol: "EX" },
        identityRegistry: {
          address: registry,
          explorerUrl: "https://sepolia.etherscan.io/address/example",
        },
      },
    };
    const user = userEvent.setup();
    renderPlatform();

    expect(screen.getByText("Token (EX)")).toBeVisible();
    expect(screen.getAllByText(token)[0]).toBeVisible();
    expect(screen.getAllByText(registry)[0]).toBeVisible();
    expect(screen.getByText("Network and environment: unknown.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Explorer" })).toHaveAttribute(
      "href",
      "https://sepolia.etherscan.io/address/example",
    );

    await user.type(screen.getByLabelText("Deployment salt"), "  custom-salt ");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect(state.suiteArgs).toHaveBeenLastCalledWith("custom-salt");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect(state.suiteRefetch).toHaveBeenCalledOnce();
    expect(
      screen.getByLabelText("Deployment salt"),
    ).toHaveAccessibleDescription(
      "Leave empty for the platform default suite.",
    );
  });

  it("requires explicit advanced mode and preserves inputs when switching or closing it", async () => {
    const user = userEvent.setup();
    renderPlatform();
    await openTokens(user);

    fireEvent.change(screen.getByLabelText(/^Token name/), {
      target: { value: "Recovery token" },
    });
    await user.click(screen.getByRole("tab", { name: /Identity & claims/ }));
    expect(
      screen.getByRole("link", { name: "compliance workflow" }),
    ).toHaveAttribute("href", "/admin/compliance");
    await user.click(screen.getByRole("tab", { name: "Tokens" }));
    expect(screen.getByLabelText(/^Token name/)).toHaveValue("Recovery token");

    await user.click(
      screen.getByRole("button", { name: "Close advanced operations" }),
    );
    expect(screen.getByLabelText(/^Token name/)).not.toBeVisible();
    expect(screen.queryByRole("textbox", { name: /^Token name/ })).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Advanced operations" }),
    );
    expect(screen.getByLabelText(/^Token name/)).toHaveValue("Recovery token");
    expect(state.contract.createToken).not.toHaveBeenCalled();
  });

  it("returns keyboard focus to the control after cancelling a confirmation", async () => {
    const user = userEvent.setup();
    renderPlatform();
    await user.click(
      screen.getByRole("button", { name: "Advanced operations" }),
    );
    const button = screen.getAllByRole("button", { name: "Run" })[0];
    button.focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("alertdialog", { name: /Run step 1/ }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(button).toHaveFocus());
    expect(state.platform.deployImplementations).not.toHaveBeenCalled();
  });

  it("treats bootstrap acceptance as unconfirmed and leaves steps individually resumable", async () => {
    state.platform.deployImplementations.mockResolvedValue({
      message: "Queued",
    });
    state.platform.deployIdentityFactory
      .mockRejectedValueOnce(new Error("Factory unavailable"))
      .mockResolvedValueOnce({ address: `0x${"c".repeat(40)}` });
    const user = userEvent.setup();
    renderPlatform();
    await user.click(
      screen.getByRole("button", { name: "Advanced operations" }),
    );

    const buttons = screen.getAllByRole("button", { name: "Run" });
    expect(buttons).toHaveLength(5);
    await user.click(buttons[0]);
    let dialog = screen.getByRole("alertdialog", { name: /Run step 1/ });
    expect(
      within(dialog).getByText(/Network and environment are not provided/),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "I understand, run" }),
    );
    expect(
      await screen.findByText(/HTTP 202 does not confirm on-chain completion/),
    ).toBeVisible();
    expect(state.platform.deployImplementations).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("button", { name: "Run" })[0]).toBeEnabled();

    await user.click(screen.getAllByRole("button", { name: "Run" })[1]);
    dialog = screen.getByRole("alertdialog", { name: /Run step 2/ });
    await user.click(
      within(dialog).getByRole("button", { name: "I understand, run" }),
    );
    expect(await screen.findByText("Factory unavailable")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Run" })[1]).toBeEnabled();

    await user.click(screen.getAllByRole("button", { name: "Run" })[1]);
    dialog = screen.getByRole("alertdialog", { name: /Run step 2/ });
    await user.click(
      within(dialog).getByRole("button", { name: "I understand, run" }),
    );
    await waitFor(() =>
      expect(state.platform.deployIdentityFactory).toHaveBeenCalledTimes(2),
    );
    expect(
      await screen.findByText(
        "Response received. Verify the outcome before continuing.",
      ),
    ).toBeVisible();
  });

  it("reviews the exact burn context, requires BURN, and treats acceptance as unconfirmed", async () => {
    let finish!: (value: { message: string }) => void;
    state.contract.burn.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const token = `0x${"a".repeat(40)}`;
    const holder = `0x${"b".repeat(40)}`;
    const user = userEvent.setup();
    renderPlatform();
    await openTokens(user);

    fireEvent.change(screen.getByLabelText(/^Token contract\s*\*?$/), {
      target: { value: token },
    });
    fireEvent.change(screen.getByLabelText(/^Amount/), {
      target: { value: "0.00000000000000000001" },
    });
    fireEvent.change(screen.getByLabelText(/^Holder wallet/), {
      target: { value: holder },
    });
    await user.click(screen.getByRole("button", { name: "Review burn" }));

    const dialog = screen.getByRole("alertdialog", {
      name: "Burn tokens permanently?",
    });
    expect(within(dialog).getByText("1e-20 tokens")).toBeVisible();
    expect(within(dialog).getByText(token)).toBeVisible();
    expect(within(dialog).getByText(holder)).toBeVisible();
    expect(
      within(dialog).getByText(/Network and environment: unknown/),
    ).toBeVisible();
    expect(within(dialog).getByText(/cannot be reversed/)).toBeVisible();
    expect(state.contract.burn).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: "Burn tokens" }),
    );
    const confirmation = within(dialog).getByLabelText(/Type BURN to confirm/);
    expect(confirmation).toHaveAccessibleDescription("Type BURN in capitals.");
    expect(state.contract.burn).not.toHaveBeenCalled();

    await user.type(confirmation, "BURN");
    await user.click(
      within(dialog).getByRole("button", { name: "Burn tokens" }),
    );
    await waitFor(() =>
      expect(state.contract.burn).toHaveBeenCalledWith({
        tokenContractAddress: token,
        amount: 1e-20,
        to: holder,
      }),
    );
    expect(
      within(dialog).getByRole("button", { name: "Burn tokens" }),
    ).toBeDisabled();
    expect(state.contract.burn).toHaveBeenCalledOnce();
    finish({ message: "Queued" });
    expect(
      await screen.findByText(
        /HTTP 202 does not confirm that the burn succeeded/,
      ),
    ).toBeVisible();
  });

  it("rejects burn amounts outside the backend's safe range and links the error", async () => {
    const user = userEvent.setup();
    renderPlatform();
    await openTokens(user);
    fireEvent.change(screen.getByLabelText(/^Token contract\s*\*?$/), {
      target: { value: `0x${"a".repeat(40)}` },
    });
    fireEvent.change(screen.getByLabelText(/^Holder wallet/), {
      target: { value: `0x${"b".repeat(40)}` },
    });
    const amount = screen.getByLabelText(/^Amount/);
    fireEvent.change(amount, { target: { value: "9007199254740992" } });
    await user.click(screen.getByRole("button", { name: "Review burn" }));

    expect(amount).toHaveAccessibleDescription(
      /Amount must be less than 9007199254740992 tokens/,
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(state.contract.burn).not.toHaveBeenCalled();
  });
});
