import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLegacyOrderIntent,
  clearOrderIntent,
  type OrderIntent,
  readOrderIntent,
  saveOrderIntent,
} from "./order-intent";

const scopedKey = (userId: number, estateId: number) =>
  `tooken:order-intent:${userId}:${estateId}`;
const legacyKey = (estateId: number) => `tooken:order-intent:${estateId}`;

const intent: OrderIntent = {
  key: "idempotency-key",
  quantity: 5,
  submitted: false,
};

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("order intent storage", () => {
  it("preserves the attempt, submission state and reference after reloading", async () => {
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: null,
      legacy: null,
    });

    expect(saveOrderIntent(1, 10, intent)).toBe(true);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent,
      legacy: null,
    });

    const submitted = { ...intent, submitted: true };
    expect(saveOrderIntent(1, 10, submitted)).toBe(true);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: submitted,
      legacy: null,
    });

    const confirmed = { ...submitted, orderRef: "ISS-20261106-ABC" };
    expect(saveOrderIntent(1, 10, confirmed)).toBe(true);
    vi.resetModules();
    const reloaded = await import("./order-intent");
    expect(reloaded.readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: confirmed,
      legacy: null,
    });
  });

  it("isolates accounts and offerings when saving and clearing", () => {
    const aliceFirst = { ...intent, key: "alice-first", submitted: true };
    const bobFirst = { ...intent, key: "bob-first" };
    const aliceSecond = { ...intent, key: "alice-second" };

    expect(saveOrderIntent(1, 10, aliceFirst)).toBe(true);
    expect(saveOrderIntent(2, 10, bobFirst)).toBe(true);
    expect(saveOrderIntent(1, 11, aliceSecond)).toBe(true);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: aliceFirst,
      legacy: null,
    });
    expect(readOrderIntent(2, 10)).toEqual({
      status: "ready",
      intent: bobFirst,
      legacy: null,
    });
    expect(readOrderIntent(1, 11)).toEqual({
      status: "ready",
      intent: aliceSecond,
      legacy: null,
    });
    expect(readOrderIntent(2, 11)).toEqual({
      status: "ready",
      intent: null,
      legacy: null,
    });

    expect(clearOrderIntent(1, 10)).toBe(true);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: null,
      legacy: null,
    });
    expect(readOrderIntent(2, 10)).toEqual({
      status: "ready",
      intent: bobFirst,
      legacy: null,
    });
    expect(readOrderIntent(1, 11)).toEqual({
      status: "ready",
      intent: aliceSecond,
      legacy: null,
    });
  });

  it("exposes ownerless legacy attempts as possibly submitted without adopting them", () => {
    const raw = '{"key":"old-key","quantity":3}';
    const legacy = { key: "old-key", quantity: 3, submitted: true };
    window.sessionStorage.setItem(legacyKey(10), raw);

    for (const userId of [1, 2]) {
      expect(readOrderIntent(userId, 10)).toEqual({
        status: "ready",
        intent: null,
        legacy,
      });
      expect(window.sessionStorage.getItem(scopedKey(userId, 10))).toBeNull();
    }
    expect(window.sessionStorage.getItem(legacyKey(10))).toBe(raw);
    expect(readOrderIntent(1, 11)).toEqual({
      status: "ready",
      intent: null,
      legacy: null,
    });
  });

  it("exposes coexisting records and clears each only when explicitly requested", () => {
    const raw = '{"key":"old-key","quantity":3}';
    const legacy = { key: "old-key", quantity: 3, submitted: true };
    window.sessionStorage.setItem(legacyKey(10), raw);

    expect(saveOrderIntent(1, 10, intent)).toBe(true);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent,
      legacy,
    });
    expect(window.sessionStorage.getItem(legacyKey(10))).toBe(raw);

    expect(clearOrderIntent(1, 10)).toBe(true);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: null,
      legacy,
    });
    expect(saveOrderIntent(1, 10, intent)).toBe(true);
    expect(clearLegacyOrderIntent(10)).toBe(true);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent,
      legacy: null,
    });
  });

  it("preserves legacy submission states and references", () => {
    const records: OrderIntent[] = [
      { key: "old-unsubmitted", quantity: 2, submitted: false },
      {
        key: "old-confirmed",
        quantity: 4,
        submitted: true,
        orderRef: "ISS-OLD",
      },
    ];

    for (const legacy of records) {
      const raw = JSON.stringify(legacy);
      window.sessionStorage.setItem(legacyKey(10), raw);
      expect(readOrderIntent(1, 10)).toEqual({
        status: "ready",
        intent: null,
        legacy,
      });
      expect(window.sessionStorage.getItem(legacyKey(10))).toBe(raw);
    }

    const raw = '{"key":"old-reference","quantity":2,"orderRef":"ISS-OLD"}';
    window.sessionStorage.setItem(legacyKey(10), raw);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: null,
      legacy: {
        key: "old-reference",
        quantity: 2,
        submitted: true,
        orderRef: "ISS-OLD",
      },
    });
    expect(window.sessionStorage.getItem(legacyKey(10))).toBe(raw);
  });

  it.each([
    ["bad JSON", "{"],
    ["an empty value", ""],
    ["null", "null"],
    ["an array", "[]"],
    ["a missing key", '{"quantity":2,"submitted":true}'],
    ["a blank key", '{"key":" ","quantity":2,"submitted":true}'],
    ["a missing quantity", '{"key":"key","submitted":true}'],
    ["a zero quantity", '{"key":"key","quantity":0,"submitted":true}'],
    ["a fractional quantity", '{"key":"key","quantity":1.5,"submitted":true}'],
    ["a missing state", '{"key":"key","quantity":2}'],
    ["a non-boolean state", '{"key":"key","quantity":2,"submitted":"true"}'],
    [
      "an invalid reference",
      '{"key":"key","quantity":2,"submitted":true,"orderRef":null}',
    ],
  ])("rejects %s without overwriting the scoped record", (_label, raw) => {
    window.sessionStorage.setItem(scopedKey(1, 10), raw);

    expect(readOrderIntent(1, 10)).toEqual({ status: "invalid" });
    expect(saveOrderIntent(1, 10, intent)).toBe(false);
    expect(window.sessionStorage.getItem(scopedKey(1, 10))).toBe(raw);

    expect(clearOrderIntent(1, 10)).toBe(true);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: null,
      legacy: null,
    });
  });

  it.each([
    ["bad JSON", "{"],
    ["a missing quantity", '{"key":"old-key"}'],
    ["an invalid state", '{"key":"old-key","quantity":2,"submitted":null}'],
    ["an invalid reference", '{"key":"old-key","quantity":2,"orderRef":""}'],
  ])(
    "reports %s in legacy storage even beside a valid intent",
    (_label, raw) => {
      expect(saveOrderIntent(1, 10, intent)).toBe(true);
      window.sessionStorage.setItem(legacyKey(10), raw);

      expect(readOrderIntent(1, 10)).toEqual({ status: "invalid" });
      expect(window.sessionStorage.getItem(legacyKey(10))).toBe(raw);
      expect(clearLegacyOrderIntent(10)).toBe(true);
      expect(readOrderIntent(1, 10)).toEqual({
        status: "ready",
        intent,
        legacy: null,
      });
    },
  );

  it("preserves valid legacy data beside a malformed scoped record", () => {
    const raw = '{"key":"old-key","quantity":3}';
    window.sessionStorage.setItem(legacyKey(10), raw);
    window.sessionStorage.setItem(scopedKey(1, 10), "{");

    expect(readOrderIntent(1, 10)).toEqual({ status: "invalid" });
    expect(saveOrderIntent(1, 10, intent)).toBe(false);
    expect(window.sessionStorage.getItem(legacyKey(10))).toBe(raw);
    expect(clearOrderIntent(1, 10)).toBe(true);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: null,
      legacy: { key: "old-key", quantity: 3, submitted: true },
    });
  });

  it("rejects malformed writes without replacing an existing attempt", () => {
    expect(saveOrderIntent(1, 10, intent)).toBe(true);
    const raw = window.sessionStorage.getItem(scopedKey(1, 10));
    const malformed: unknown[] = [
      null,
      { quantity: 1, submitted: true },
      { key: "key", quantity: 1 },
      { key: "key", quantity: -1, submitted: true },
      { key: "key", quantity: Number.NaN, submitted: true },
      { key: "key", quantity: 1, submitted: true, orderRef: "" },
      Object.assign(Object.create({ submitted: true }), {
        key: "key",
        quantity: 1,
      }),
    ];

    for (const candidate of malformed) {
      expect(saveOrderIntent(1, 10, candidate as OrderIntent)).toBe(false);
      expect(window.sessionStorage.getItem(scopedKey(1, 10))).toBe(raw);
    }
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])(
    "rejects invalid identifiers such as %s without touching storage",
    (id) => {
      expect(readOrderIntent(id, 10)).toEqual({ status: "invalid" });
      expect(readOrderIntent(1, id)).toEqual({ status: "invalid" });
      expect(saveOrderIntent(id, 10, intent)).toBe(false);
      expect(saveOrderIntent(1, id, intent)).toBe(false);
      expect(clearOrderIntent(id, 10)).toBe(false);
      expect(clearOrderIntent(1, id)).toBe(false);
      expect(clearLegacyOrderIntent(id)).toBe(false);
      expect(window.sessionStorage.length).toBe(0);
    },
  );
});

describe("unavailable or unreliable session storage", () => {
  it("does not access window during server-side imports or operations", async () => {
    vi.stubGlobal("window", undefined);
    vi.resetModules();
    const server = await import("./order-intent");

    expect(server.readOrderIntent(1, 10)).toEqual({ status: "unavailable" });
    expect(server.saveOrderIntent(1, 10, intent)).toBe(false);
    expect(server.clearOrderIntent(1, 10)).toBe(false);
    expect(server.clearLegacyOrderIntent(10)).toBe(false);
  });

  it("handles a blocked sessionStorage getter", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("Storage blocked");
    });

    expect(readOrderIntent(1, 10)).toEqual({ status: "unavailable" });
    expect(saveOrderIntent(1, 10, intent)).toBe(false);
    expect(clearOrderIntent(1, 10)).toBe(false);
    expect(clearLegacyOrderIntent(10)).toBe(false);
  });

  it("handles exceptions from storage methods", () => {
    const get = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("Read blocked");
      });
    expect(readOrderIntent(1, 10)).toEqual({ status: "unavailable" });
    expect(saveOrderIntent(1, 10, intent)).toBe(false);
    get.mockRestore();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    expect(saveOrderIntent(1, 10, intent)).toBe(false);

    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("Remove blocked");
    });
    expect(clearOrderIntent(1, 10)).toBe(false);
    expect(clearLegacyOrderIntent(10)).toBe(false);
  });

  it("detects new writes and updates that are silently ignored", () => {
    expect(saveOrderIntent(1, 10, intent)).toBe(true);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});

    expect(saveOrderIntent(1, 10, { ...intent, submitted: true })).toBe(false);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent,
      legacy: null,
    });
    expect(saveOrderIntent(2, 10, intent)).toBe(false);
    expect(readOrderIntent(2, 10)).toEqual({
      status: "ready",
      intent: null,
      legacy: null,
    });
  });

  it("detects removals that are silently ignored for both key types", () => {
    expect(saveOrderIntent(1, 10, intent)).toBe(true);
    window.sessionStorage.setItem(
      legacyKey(10),
      '{"key":"old-key","quantity":3}',
    );
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {});

    expect(clearOrderIntent(1, 10)).toBe(false);
    expect(clearLegacyOrderIntent(10)).toBe(false);
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent,
      legacy: { key: "old-key", quantity: 3, submitted: true },
    });
  });

  it("returns false when a successful write cannot be verified", () => {
    const get = vi
      .spyOn(Storage.prototype, "getItem")
      .mockReturnValueOnce(null)
      .mockImplementationOnce(() => {
        throw new Error("Verification blocked");
      });

    expect(saveOrderIntent(1, 10, intent)).toBe(false);
    get.mockRestore();
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent,
      legacy: null,
    });
  });

  it("returns false when successful removals cannot be verified", () => {
    expect(saveOrderIntent(1, 10, intent)).toBe(true);
    window.sessionStorage.setItem(
      legacyKey(10),
      '{"key":"old-key","quantity":3}',
    );
    const get = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("Verification blocked");
      });

    expect(clearOrderIntent(1, 10)).toBe(false);
    expect(clearLegacyOrderIntent(10)).toBe(false);
    get.mockRestore();
    expect(readOrderIntent(1, 10)).toEqual({
      status: "ready",
      intent: null,
      legacy: null,
    });
  });
});
