import { describe, expect, it } from "vitest";
import {
  canInvest,
  isOrderInFlight,
  isOrderSettled,
  orderStatusMeta,
  orderTimeline,
} from "./status";

const states = (code: string) => orderTimeline(code).map((s) => s.state);

describe("orderTimeline", () => {
  it("tracks the happy path", () => {
    expect(states("AWAITING_PAYMENT")).toEqual([
      "done",
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect(states("PAYMENT_CONFIRMED")).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
    ]);
    expect(states("CLOSED")).toEqual(["done", "done", "done", "done"]);
  });

  it("marks the failing step", () => {
    expect(states("EXPIRED")).toEqual([
      "done",
      "failed",
      "upcoming",
      "upcoming",
    ]);
    expect(states("DELIVERY_FAILED")).toEqual([
      "done",
      "done",
      "failed",
      "upcoming",
    ]);
  });
});

describe("order status helpers", () => {
  it("knows which orders still move", () => {
    expect(isOrderInFlight("AWAITING_PAYMENT")).toBe(true);
    expect(isOrderInFlight("PAYMENT_CONFIRMED")).toBe(true);
    expect(isOrderInFlight("CLOSED")).toBe(false);
    expect(isOrderInFlight(undefined)).toBe(false);
  });

  it("treats delivered and closed orders as settled", () => {
    expect(isOrderSettled("CLOSED")).toBe(true);
    expect(isOrderSettled("DELIVERED")).toBe(true);
    expect(isOrderSettled("AWAITING_PAYMENT")).toBe(false);
  });

  it("falls back to a neutral label for unknown codes", () => {
    expect(orderStatusMeta("SOMETHING_NEW").tone).toBe("neutral");
  });
});

describe("canInvest", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");

  it("requires a verified KYC", () => {
    expect(canInvest("approved", null, now)).toBe(false);
    expect(canInvest("submitted", null, now)).toBe(false);
    expect(canInvest("verified", null, now)).toBe(true);
  });

  it("rejects an expired KYC", () => {
    expect(canInvest("verified", "2025-12-31T23:59:59Z", now)).toBe(false);
    expect(canInvest("verified", "2027-01-01T00:00:00Z", now)).toBe(true);
  });
});
