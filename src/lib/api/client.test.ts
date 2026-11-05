import Cookies from "js-cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";
import { ApiError, apiData, apiRequest, SESSION_EXPIRED_EVENT } from "./client";
import { orderApi } from "./endpoints";

function jwt(payload: object): string {
  const encode = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.sig`;
}

const future = Math.floor(Date.now() / 1000) + 3600;
const ACCESS = jwt({
  userId: 3,
  role: "USER",
  tokenUse: "access",
  exp: future,
});
const NEW_ACCESS = jwt({
  userId: 3,
  role: "USER",
  tokenUse: "access",
  exp: future + 1,
});
const REFRESH = jwt({ userId: 3, tokenUse: "refresh", exp: future + 7200 });

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  Cookies.set(ACCESS_COOKIE, ACCESS);
  Cookies.set(REFRESH_COOKIE, REFRESH);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  Cookies.remove(ACCESS_COOKIE);
  Cookies.remove(REFRESH_COOKIE);
});

const authHeader = (call: number) =>
  (fetchMock.mock.calls[call][1]?.headers as Record<string, string>)
    .Authorization;

describe("apiRequest", () => {
  it("sends the bearer token through the same-origin proxy", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { status: "ok" }));
    await apiRequest("/health");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backend/health");
    expect(authHeader(0)).toBe(`Bearer ${ACCESS}`);
  });

  it("surfaces the backend message in an ApiError", async () => {
    fetchMock.mockResolvedValueOnce(
      json(409, { message: "Not enough shares available", data: { left: 3 } }),
    );
    const error = await apiRequest("/x").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      message: "Not enough shares available",
      data: { left: 3 },
    });
  });

  it("exposes the missing fields of a completeness conflict", async () => {
    fetchMock.mockResolvedValueOnce(
      json(409, {
        message: "not complete enough",
        missing_fields: ["description", "configuration.yield"],
        data: null,
      }),
    );
    await expect(apiRequest("/x")).rejects.toMatchObject({
      missingFields: ["description", "configuration.yield"],
    });
  });

  it("uses a generic message when the body has none", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
    await expect(apiRequest("/x")).rejects.toMatchObject({
      status: 503,
      message: "The service is temporarily unavailable.",
    });
  });

  it("refreshes once on 401 and replays the request", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { message: "expired" }))
      .mockResolvedValueOnce(
        json(200, { data: { token: NEW_ACCESS, refreshToken: REFRESH } }),
      )
      .mockResolvedValueOnce(json(200, { data: [1, 2] }));

    await expect(apiData<number[]>("/orders")).resolves.toEqual([1, 2]);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/backend/auth/refresh");
    expect(authHeader(2)).toBe(`Bearer ${NEW_ACCESS}`);
    expect(Cookies.get(ACCESS_COOKIE)).toBe(NEW_ACCESS);
  });

  it("ends the session when the refresh fails", async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    fetchMock
      .mockResolvedValueOnce(json(401, { message: "expired" }))
      .mockResolvedValueOnce(json(401, { message: "invalid refresh" }));

    await expect(apiRequest("/users/me")).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(Cookies.get(ACCESS_COOKIE)).toBeUndefined();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("maps network failures to status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(apiRequest("/x")).rejects.toMatchObject({ status: 0 });
  });
});

describe("orderApi.create", () => {
  it("forwards the caller's idempotency key so retries are safe", async () => {
    fetchMock.mockImplementation(async () =>
      json(201, { data: { orderRef: "ISS-1" } }),
    );
    await orderApi.create({ realEstateId: 1, quantity: 20 }, "intent-42");
    await orderApi.create({ realEstateId: 1, quantity: 20 }, "intent-42");
    const keys = fetchMock.mock.calls.map(
      ([, init]) =>
        (init?.headers as Record<string, string>)["Idempotency-Key"],
    );
    expect(keys).toEqual(["intent-42", "intent-42"]);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      realEstateId: 1,
      quantity: 20,
    });
  });
});
