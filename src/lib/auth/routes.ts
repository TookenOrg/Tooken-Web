import type { Role } from "@/lib/api/types";

/** Routes that need a session, whatever the role. */
const AUTHENTICATED: RegExp[] = [
  /^\/dashboard(\/|$)/,
  /^\/orders(\/|$)/,
  /^\/verification(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/favorites(\/|$)/,
  /^\/real-estate\/[^/]+\/buy\/?$/,
  /^\/admin(\/|$)/,
];

/** Back-office: MANAGER and ADMIN. */
const STAFF: RegExp[] = [/^\/admin(\/|$)/];

/** Back-office pages reserved to ADMIN. */
const ADMIN_ONLY: RegExp[] = [
  /^\/admin\/compliance(\/|$)/,
  /^\/admin\/platform(\/|$)/,
];

const GUEST_ONLY = ["/sign-in", "/sign-up"];

export type RouteDecision =
  | { type: "next" }
  | { type: "redirect"; to: string; withCallback?: boolean };

export function homeFor(role: Role | undefined | null): string {
  return role === "ADMIN" || role === "MANAGER" ? "/admin" : "/dashboard";
}

/**
 * Pure routing decision used by the edge proxy. The role comes from an
 * unverified token: it only steers navigation, the backend enforces access.
 */
export function decideRoute(
  pathname: string,
  session: { authenticated: boolean; role?: Role | null },
): RouteDecision {
  const legacyOrder = pathname.match(/^\/user\/orders\/([^/]+)\/?$/);
  if (legacyOrder) return { type: "redirect", to: `/orders/${legacyOrder[1]}` };

  if (GUEST_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return session.authenticated
      ? { type: "redirect", to: homeFor(session.role) }
      : { type: "next" };
  }

  if (!AUTHENTICATED.some((r) => r.test(pathname))) return { type: "next" };
  if (!session.authenticated) {
    return { type: "redirect", to: "/sign-in", withCallback: true };
  }

  const staff = session.role === "ADMIN" || session.role === "MANAGER";
  if (STAFF.some((r) => r.test(pathname)) && !staff) {
    return { type: "redirect", to: "/dashboard" };
  }
  if (ADMIN_ONLY.some((r) => r.test(pathname)) && session.role !== "ADMIN") {
    return { type: "redirect", to: "/admin" };
  }
  if (/^\/real-estate\/[^/]+\/buy\/?$/.test(pathname) && staff) {
    return { type: "redirect", to: pathname.replace(/\/buy\/?$/, "") };
  }
  return { type: "next" };
}
