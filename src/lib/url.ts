/**
 * Ensures that the callbackUrl is an internal route
 * to prevent redirection to external websites (Open Redirect)
 */
export function getSafeCallbackUrl(callbackUrl: string | null, fallback = "/"): string {
    if (!callbackUrl) return fallback;

    try {
        // Only allow relative paths starting with "/"
        // and reject anything containing "://" (http, https, etc.)
        const decoded = decodeURIComponent(callbackUrl);
        if (decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.includes("://")) {
            return decoded;
        }
    } catch {
        // decodeURIComponent failed → malformed URL
    }

    return fallback;
}