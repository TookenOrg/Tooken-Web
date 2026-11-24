import { resolveRedirect } from "../_components/auth-shell";

export function safeCallback(
  callbackUrl: string | null,
  fallback: string,
): string {
  const destination = resolveRedirect(callbackUrl, fallback);
  try {
    return new URL(destination, window.location.origin).origin ===
      window.location.origin
      ? destination
      : fallback;
  } catch {
    return fallback;
  }
}
