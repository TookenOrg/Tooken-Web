import Cookies from "js-cookie";
import type { JwtToken, Role } from "@/lib/api/types";

export const ACCESS_COOKIE = "TOKEN";
export const REFRESH_COOKIE = "REFRESH_TOKEN";

export type JwtClaims = {
  userId: number;
  email?: string;
  role?: Role;
  tokenUse?: "access" | "refresh";
  exp: number;
  iat?: number;
};

/** Decodes a JWT payload without verifying it: the backend is the authority. */
export function decodeJwt(token: string | undefined | null): JwtClaims | null {
  if (!token) return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as JwtClaims;
    return typeof claims.exp === "number" ? claims : null;
  } catch {
    return null;
  }
}

/** True when the token expires within `skewSeconds`. */
export function isExpired(
  claims: JwtClaims | null,
  skewSeconds = 30,
  now = Date.now(),
): boolean {
  if (!claims) return true;
  return claims.exp * 1000 - skewSeconds * 1000 <= now;
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const l of listeners) l();
}

function cookieOptions(expires: Date): Cookies.CookieAttributes {
  return {
    expires,
    sameSite: "lax",
    secure:
      typeof window !== "undefined" && window.location.protocol === "https:",
    path: "/",
  };
}

export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_COOKIE);
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_COOKIE);
}

/**
 * Both cookies live as long as the refresh token: an expired access token is
 * renewed transparently, so the session really ends with the refresh token.
 */
export function setSession(jwt: Pick<JwtToken, "token" | "refreshToken">) {
  const access = decodeJwt(jwt.token);
  const refresh = decodeJwt(jwt.refreshToken);
  const until = new Date((refresh?.exp ?? access?.exp ?? 0) * 1000);
  Cookies.set(ACCESS_COOKIE, jwt.token, cookieOptions(until));
  if (jwt.refreshToken) {
    Cookies.set(REFRESH_COOKIE, jwt.refreshToken, cookieOptions(until));
  }
  emit();
}

export function clearSession() {
  Cookies.remove(ACCESS_COOKIE, { path: "/" });
  Cookies.remove(REFRESH_COOKIE, { path: "/" });
  emit();
}

export function getClaims(): JwtClaims | null {
  return decodeJwt(getAccessToken());
}

export function isStaff(role: Role | undefined | null): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
