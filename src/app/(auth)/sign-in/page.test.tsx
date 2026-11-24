import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import SignInPage from "./page";

const state = vi.hoisted(() => ({
  signIn: vi.fn(),
  replace: vi.fn(),
  query: "",
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({ signIn: state.signIn }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
  useSearchParams: () => new URLSearchParams(state.query),
}));

beforeEach(() => {
  state.signIn.mockReset();
  state.replace.mockReset();
  state.query = "";
  vi.stubEnv("DEMO_MODE", "false");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sign in", () => {
  it.each(["false", "", "TRUE"])(
    "hides demo accounts unless demo mode is explicitly true (%s)",
    (mode) => {
      vi.stubEnv("DEMO_MODE", mode);
      render(<SignInPage />);

      expect(
        screen.queryByRole("region", { name: "Demo accounts" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("claire@invest.lu")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /forgot password/i }),
      ).toBeNull();
    },
  );

  it("fills a demo account only in demo mode and preserves password manager attributes", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const user = userEvent.setup();
    render(<SignInPage />);

    await user.click(screen.getByRole("button", { name: /Investor/ }));

    const email = screen.getByLabelText(/^Email address/);
    const password = screen.getByLabelText(/^Password/);
    expect(email).toHaveValue("claire@invest.lu");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(email).toHaveAttribute("placeholder", "name@example.com");
    expect(password).toHaveValue("Investor1234!");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toHaveAccessibleDescription(/72 UTF-8 bytes/);

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("Investor1234!");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("preserves input on a generic credential failure and distinguishes a service outage", async () => {
    state.signIn
      .mockRejectedValueOnce(new ApiError(401, "Account does not exist"))
      .mockRejectedValueOnce(new ApiError(503, "database detail"));
    const user = userEvent.setup();
    render(<SignInPage />);

    await user.type(
      screen.getByLabelText(/^Email address/),
      "name@example.com",
    );
    await user.type(screen.getByLabelText(/^Password/), "legacy");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect",
    );
    expect(screen.queryByText("Account does not exist")).toBeNull();
    expect(screen.getByLabelText(/^Email address/)).toHaveValue(
      "name@example.com",
    );
    expect(screen.getByLabelText(/^Password/)).toHaveValue("legacy");
    expect(state.signIn).toHaveBeenCalledWith("name@example.com", "legacy");

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The service is temporarily unavailable.",
    );
    expect(screen.queryByText("database detail")).toBeNull();
  });

  it("associates validation errors and keeps the 72-byte limit without adding an eight-character sign-in minimum", async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    const email = screen.getByLabelText(/^Email address/);
    const password = screen.getByLabelText(/^Password/);
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription("Enter a valid email address.");
      expect(password).toHaveAccessibleDescription(/Password is required/);
    });

    fireEvent.change(email, { target: { value: "name@example.com" } });
    fireEvent.change(password, { target: { value: "é".repeat(37) } });
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(password).toHaveAccessibleDescription(/at most 72 UTF-8 bytes/i);
      expect(password).toHaveAttribute("aria-invalid", "true");
    });
    expect(state.signIn).not.toHaveBeenCalled();
  });

  it("preserves a safe callback and rejects an external callback", async () => {
    state.signIn.mockResolvedValue({ role: "USER" });
    state.query = `callbackUrl=${encodeURIComponent("/real-estate/8/buy?from=explore")}`;
    const user = userEvent.setup();
    const { unmount } = render(<SignInPage />);

    expect(
      screen.getByRole("link", { name: "Open an account" }),
    ).toHaveAttribute(
      "href",
      `/sign-up?callbackUrl=${encodeURIComponent("/real-estate/8/buy?from=explore")}`,
    );
    await user.type(
      screen.getByLabelText(/^Email address/),
      "name@example.com",
    );
    await user.type(screen.getByLabelText(/^Password/), "short");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith(
        "/real-estate/8/buy?from=explore",
      ),
    );

    unmount();
    state.replace.mockClear();
    state.query = `callbackUrl=${encodeURIComponent("//outside.example")}`;
    render(<SignInPage />);
    await user.type(
      screen.getByLabelText(/^Email address/),
      "name@example.com",
    );
    await user.type(screen.getByLabelText(/^Password/), "short");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith("/dashboard"),
    );
  });

  it("rejects a callback that becomes external after URL control-character normalization", async () => {
    state.signIn.mockResolvedValue({ role: "USER" });
    state.query = `callbackUrl=${encodeURIComponent("/\n/outside.example")}`;
    const user = userEvent.setup();
    render(<SignInPage />);
    await user.type(
      screen.getByLabelText(/^Email address/),
      "name@example.com",
    );
    await user.type(screen.getByLabelText(/^Password/), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith("/dashboard"),
    );
  });
});
