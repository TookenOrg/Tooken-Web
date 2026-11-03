import { render } from "@testing-library/react";
import Cookies from "js-cookie";
import { afterEach, expect, it, vi } from "vitest";
import {
  ACCESS_COOKIE,
  clearSession,
  REFRESH_COOKIE,
} from "@/lib/auth/session";
import LogoutPage from "./page";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({ signOut }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  signOut.mockReset();
  clearSession();
});

it("clears the session before navigating to the home with a full page replacement", () => {
  Cookies.set(ACCESS_COOKIE, "access");
  Cookies.set(REFRESH_COOKIE, "refresh");
  signOut.mockImplementation(clearSession);

  const location = window.location;
  const replace = vi.fn(() => {
    expect(Cookies.get(ACCESS_COOKIE)).toBeUndefined();
    expect(Cookies.get(REFRESH_COOKIE)).toBeUndefined();
  });
  vi.stubGlobal(
    "window",
    new Proxy(window, {
      get(target, key) {
        if (key === "location") return { protocol: location.protocol, replace };
        return Reflect.get(target, key, target);
      },
    }),
  );

  render(<LogoutPage />);

  expect(signOut).toHaveBeenCalledOnce();
  expect(replace).toHaveBeenCalledExactlyOnceWith("/");
});
