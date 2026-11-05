import {
  clearSession,
  decodeJwt,
  getAccessToken,
  getRefreshToken,
  isExpired,
  setSession,
} from "@/lib/auth/session";
import type { Envelope, JwtToken } from "./types";

/** Same-origin prefix rewritten by Next to the backend (see next.config.ts). */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/backend";

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  /** Fields to complete, sent with a 409 completeness conflict. */
  readonly missingFields: string[];

  constructor(
    status: number,
    message: string,
    data?: unknown,
    missingFields: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.missingFields = missingFields;
  }
}

export const SESSION_EXPIRED_EVENT = "tooken:session-expired";

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "The request is invalid.",
  401: "Your session has expired. Please sign in again.",
  403: "You are not allowed to perform this operation.",
  404: "The requested resource was not found.",
  409: "The operation conflicts with the current state.",
  422: "The request could not be processed.",
  429: "Too many requests. Please retry in a moment.",
};

export function defaultMessage(status: number): string {
  if (status === 0) return "The service is unreachable. Check your connection.";
  if (status >= 500) return "The service is temporarily unavailable.";
  return DEFAULT_MESSAGES[status] ?? "Unexpected error.";
}

/** Human-readable message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Unexpected error.";
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  headers?: Record<string, string>;
  /** Attach the bearer token. Defaults to true; anonymous calls stay valid. */
  auth?: boolean;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

let refreshing: Promise<boolean> | null = null;

/** Renews the access token once, sharing the call between concurrent requests. */
export function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  const refreshToken = getRefreshToken();
  if (!refreshToken || isExpired(decodeJwt(refreshToken), 0)) {
    return Promise.resolve(false);
  }
  refreshing = (async () => {
    try {
      const res = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const body = (await parseBody(res)) as Envelope<JwtToken> | undefined;
      if (!body?.data?.token) return false;
      setSession({
        token: body.data.token,
        refreshToken: body.data.refreshToken || refreshToken,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function expireSession() {
  clearSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

async function send(
  path: string,
  options: RequestOptions,
  token: string | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ApiError(0, defaultMessage(0));
  }
}

/**
 * Calls the backend and returns the parsed JSON body as is. Errors become an
 * ApiError carrying the backend `message`. An expired access token is
 * refreshed before the call, and a 401 triggers one refresh and one retry.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const useAuth = options.auth !== false;
  let token = useAuth ? getAccessToken() : undefined;

  if (token && isExpired(decodeJwt(token))) {
    token = (await refreshSession()) ? getAccessToken() : undefined;
    if (!token) expireSession();
  }

  let res = await send(path, options, token);

  if (res.status === 401 && token) {
    if (await refreshSession()) {
      res = await send(path, options, getAccessToken());
    }
    if (res.status === 401) expireSession();
  }

  const body = await parseBody(res);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : typeof body === "string" && body.length < 300 && body.trim()
          ? body
          : defaultMessage(res.status);
    const data =
      body && typeof body === "object" && "data" in body
        ? (body as { data: unknown }).data
        : body;
    const missing =
      body && typeof body === "object" && "missing_fields" in body
        ? (body as { missing_fields: unknown }).missing_fields
        : undefined;
    throw new ApiError(
      res.status,
      message || defaultMessage(res.status),
      data,
      Array.isArray(missing)
        ? missing.filter((f): f is string => typeof f === "string")
        : [],
    );
  }
  return body as T;
}

/** Unwraps the `{ message, data }` envelope. */
export async function apiData<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const body = await apiRequest<Envelope<T>>(path, options);
  return body?.data as T;
}

/** Generates an Idempotency-Key, falling back when randomUUID is unavailable. */
export function newIdempotencyKey(): string {
  const c: Crypto = globalThis.crypto;
  if (typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
