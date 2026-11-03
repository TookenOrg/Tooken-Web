import { describe, expect, it } from "vitest";
import { decideRoute, homeFor } from "./routes";

const anonymous = { authenticated: false };
const investor = { authenticated: true, role: "USER" as const };
const manager = { authenticated: true, role: "MANAGER" as const };
const admin = { authenticated: true, role: "ADMIN" as const };

describe("decideRoute", () => {
  it("lets anyone browse public pages", () => {
    expect(decideRoute("/", anonymous)).toEqual({ type: "next" });
    expect(decideRoute("/explore", anonymous)).toEqual({ type: "next" });
    expect(decideRoute("/real-estate/1", anonymous)).toEqual({ type: "next" });
  });

  it("sends anonymous visitors of private pages to sign-in with a callback", () => {
    for (const path of [
      "/dashboard",
      "/orders/ISS-1",
      "/real-estate/1/buy",
      "/admin",
    ]) {
      expect(decideRoute(path, anonymous)).toEqual({
        type: "redirect",
        to: "/sign-in",
        withCallback: true,
      });
    }
  });

  it("keeps signed-in users away from guest pages", () => {
    expect(decideRoute("/sign-in", investor)).toEqual({
      type: "redirect",
      to: "/dashboard",
    });
    expect(decideRoute("/sign-up", manager)).toEqual({
      type: "redirect",
      to: "/admin",
    });
  });

  it("restricts the back office to staff and some pages to admins", () => {
    expect(decideRoute("/admin/orders", investor)).toEqual({
      type: "redirect",
      to: "/dashboard",
    });
    expect(decideRoute("/admin/orders", manager)).toEqual({ type: "next" });
    expect(decideRoute("/admin/compliance/3", manager)).toEqual({
      type: "redirect",
      to: "/admin",
    });
    expect(decideRoute("/admin/platform", admin)).toEqual({ type: "next" });
  });

  it("does not let staff subscribe", () => {
    expect(decideRoute("/real-estate/4/buy", admin)).toEqual({
      type: "redirect",
      to: "/real-estate/4",
    });
    expect(decideRoute("/real-estate/4/buy", investor)).toEqual({
      type: "next",
    });
  });

  it("redirects legacy order links", () => {
    expect(decideRoute("/user/orders/ISS-20261102-9GRKGX", anonymous)).toEqual({
      type: "redirect",
      to: "/orders/ISS-20261102-9GRKGX",
    });
  });
});

describe("homeFor", () => {
  it("routes staff to the back office", () => {
    expect(homeFor("ADMIN")).toBe("/admin");
    expect(homeFor("MANAGER")).toBe("/admin");
    expect(homeFor("USER")).toBe("/dashboard");
    expect(homeFor(undefined)).toBe("/dashboard");
  });
});
