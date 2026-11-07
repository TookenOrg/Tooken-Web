import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import SignUpPage from "./page";

const state = vi.hoisted(() => ({
  signUp: vi.fn(),
  replace: vi.fn(),
  query: "",
}));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({ signUp: state.signUp }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
  useSearchParams: () => new URLSearchParams(state.query),
}));

beforeEach(() => {
  state.signUp.mockReset();
  state.replace.mockReset();
  state.query = "";
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function fillIdentity() {
  fireEvent.change(screen.getByLabelText(/^First name/), {
    target: { value: "Ada" },
  });
  fireEvent.change(screen.getByLabelText(/^Last name/), {
    target: { value: "Lovelace" },
  });
  fireEvent.change(screen.getByLabelText(/^Email address/), {
    target: { value: "ada@example.com" },
  });
}

describe("sign up", () => {
  it("shows password requirements and unavailable legal documents without dead links", () => {
    render(<SignUpPage />);

    const email = screen.getByLabelText(/^Email address/);
    const password = screen.getByLabelText(/^Password/);
    const confirm = screen.getByLabelText(/^Confirm password/);
    const terms = screen.getByRole("checkbox", { name: /I accept/ });
    expect(email).toHaveAttribute("placeholder", "name@example.com");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("autocomplete", "new-password");
    expect(confirm).toHaveAttribute("autocomplete", "new-password");
    expect(password).toHaveAccessibleDescription(
      /at least 8 characters and at most 72 UTF-8 bytes/i,
    );
    expect(terms).not.toBeChecked();
    expect(terms).toHaveAccessibleDescription(
      /not currently available to review/i,
    );
    expect(
      screen.queryByRole("link", { name: /Terms of Use|Privacy Notice/i }),
    ).toBeNull();
    expect(
      screen.getByText(/identity verification to subscribe/i),
    ).toBeVisible();
  });

  it("associates field and consent errors with their controls", async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByLabelText(/^First name/)).toHaveAccessibleDescription(
        "First name is required.",
      );
      expect(screen.getByLabelText(/^Last name/)).toHaveAccessibleDescription(
        "Last name is required.",
      );
      expect(
        screen.getByLabelText(/^Email address/),
      ).toHaveAccessibleDescription("Enter a valid email address.");
      expect(
        screen.getByLabelText(/^Confirm password/),
      ).toHaveAccessibleDescription("Confirm your password.");
      expect(
        screen.getByRole("checkbox", { name: /I accept/ }),
      ).toHaveAccessibleDescription(/You must accept the terms/);
    });
    expect(state.signUp).not.toHaveBeenCalled();
  });

  it("enforces eight characters and the UTF-8 byte limit while preserving the original callback", async () => {
    state.signUp.mockResolvedValue({ role: "USER" });
    state.query = `callbackUrl=${encodeURIComponent("/real-estate/4/buy")}`;
    const user = userEvent.setup();
    render(<SignUpPage />);
    fillIdentity();

    const password = screen.getByLabelText(/^Password/);
    const confirm = screen.getByLabelText(/^Confirm password/);
    await user.click(screen.getByRole("checkbox", { name: /I accept/ }));
    fireEvent.change(password, { target: { value: "1234567" } });
    fireEvent.change(confirm, { target: { value: "1234567" } });
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(password).toHaveAccessibleDescription(/Use at least 8 characters/),
    );
    expect(state.signUp).not.toHaveBeenCalled();

    const tooLong = "é".repeat(37);
    fireEvent.change(password, { target: { value: tooLong } });
    fireEvent.change(confirm, { target: { value: tooLong } });
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(password).toHaveAccessibleDescription(/at most 72 UTF-8 bytes/i),
    );
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(state.signUp).not.toHaveBeenCalled();

    const maximum = "é".repeat(36);
    fireEvent.change(password, { target: { value: maximum } });
    fireEvent.change(confirm, { target: { value: maximum } });
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(state.signUp).toHaveBeenCalledWith({
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        password: maximum,
      }),
    );
    expect(state.replace).toHaveBeenCalledWith("/real-estate/4/buy");
  });

  it("preserves input and consent on failure and keeps the sign-in callback", async () => {
    state.query = `callbackUrl=${encodeURIComponent("/orders/123")}`;
    state.signUp.mockRejectedValue(new ApiError(503, "Please try again."));
    const user = userEvent.setup();
    render(<SignUpPage />);
    fillIdentity();

    const password = screen.getByLabelText(/^Password/);
    const confirm = screen.getByLabelText(/^Confirm password/);
    fireEvent.change(password, { target: { value: "Example123!" } });
    fireEvent.change(confirm, { target: { value: "Example123!" } });
    await user.click(screen.getByRole("checkbox", { name: /I accept/ }));
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please try again.",
    );
    expect(screen.getByLabelText(/^First name/)).toHaveValue("Ada");
    expect(screen.getByLabelText(/^Last name/)).toHaveValue("Lovelace");
    expect(screen.getByLabelText(/^Email address/)).toHaveValue(
      "ada@example.com",
    );
    expect(password).toHaveValue("Example123!");
    expect(confirm).toHaveValue("Example123!");
    expect(screen.getByRole("checkbox", { name: /I accept/ })).toBeChecked();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      `/sign-in?callbackUrl=${encodeURIComponent("/orders/123")}`,
    );
  });

  it("keeps submission disabled while pending and rejects an external callback", async () => {
    let finish!: (value: { role: "USER" }) => void;
    state.signUp.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    state.query = `callbackUrl=${encodeURIComponent("/\n/outside.example")}`;
    const user = userEvent.setup();
    render(<SignUpPage />);
    fillIdentity();
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "Example123!" },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm password/), {
      target: { value: "Example123!" },
    });
    await user.click(screen.getByRole("checkbox", { name: /I accept/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("button", { name: /Creating account/ }),
    ).toBeDisabled();
    expect(state.signUp).toHaveBeenCalledOnce();
    finish({ role: "USER" });
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith("/dashboard"),
    );
  });
});
