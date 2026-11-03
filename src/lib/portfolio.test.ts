import { describe, expect, it } from "vitest";
import type { IssuanceOrder } from "@/lib/api/types";
import {
  committedShares,
  divideDecimal,
  formatCountdown,
  investmentShareBounds,
  maxSubscribable,
  orderCategory,
  summarizePortfolio,
} from "./portfolio";

function order(p: Partial<IssuanceOrder>): IssuanceOrder {
  return {
    userId: 3,
    orderRef: "ISS-1",
    tokenQuantity: 20,
    realEstateId: 1,
    statusCode: "CLOSED",
    unitPrice: "250.00000000",
    currencyCode: "EUR",
    grossAmount: "5000.00",
    amountDue: "5100.00",
    feeAmount: "100.00",
    fees: [],
    reservationExpiresAt: "2026-11-02T19:15:11Z",
    createdAt: "2026-11-02T19:00:11Z",
    updatedAt: "2026-11-02T19:00:11Z",
    realEstateTitle: "Résidence Kirchberg",
    ...p,
  };
}

describe("summarizePortfolio", () => {
  it("aggregates settled orders per offering with exact sums", () => {
    const s = summarizePortfolio([
      order({
        orderRef: "A",
        tokenQuantity: 3,
        unitPrice: "0.10000000",
        grossAmount: "0.30",
      }),
      order({
        orderRef: "B",
        tokenQuantity: 3,
        unitPrice: "0.20000000",
        grossAmount: "0.60",
        createdAt: "2026-11-03T00:00:00Z",
      }),
      order({
        orderRef: "C",
        realEstateId: 2,
        realEstateTitle: "Dock",
        tokenQuantity: 1,
        unitPrice: "1000",
        grossAmount: "1000.00",
        statusCode: "DELIVERED",
      }),
    ]);
    expect(s.invested).toEqual({ EUR: "1000.90" });
    expect(s.sharesHeld).toBe(7);
    expect(s.holdings.map((h) => h.realEstateId)).toEqual([2, 1]);
    const kirchberg = s.holdings[1];
    expect(kirchberg).toMatchObject({
      shares: 6,
      invested: "0.90",
      averagePrice: "0.15",
      orders: 2,
      lastOrderAt: "2026-11-03T00:00:00Z",
    });
  });

  it("counts pending orders separately and ignores failed ones", () => {
    const s = summarizePortfolio(
      [
        order({ statusCode: "AWAITING_PAYMENT", amountDue: "5100.00" }),
        order({ statusCode: "PAYMENT_CONFIRMED", amountDue: "102.00" }),
        order({ statusCode: "EXPIRED" }),
        order({ statusCode: "CLOSED", currencyCode: "CHF" }),
      ],
      { 1: "Kirchberg (renamed)" },
    );
    expect(s.pendingCount).toBe(2);
    expect(s.pendingAmount).toEqual({ EUR: "5202.00" });
    expect(s.invested).toEqual({ CHF: "5000.00" });
    expect(s.holdings[0].title).toBe("Kirchberg (renamed)");
  });
});

describe("helpers", () => {
  it("divides exactly with half-up rounding", () => {
    expect(divideDecimal("10", "3")).toBe("3.33");
    expect(divideDecimal("2", "3")).toBe("0.67");
    expect(divideDecimal("5000.00", 20)).toBe("250.00");
    expect(divideDecimal("1", "0")).toBe("0.00");
  });

  it("categorises order statuses", () => {
    expect(orderCategory("AWAITING_PAYMENT")).toBe("in_progress");
    expect(orderCategory("CLOSED")).toBe("settled");
    expect(orderCategory("REFUNDED")).toBe("other");
  });

  it("caps the subscribable quantity", () => {
    const orders = [
      order({ tokenQuantity: 20 }),
      order({ tokenQuantity: 5, statusCode: "AWAITING_PAYMENT" }),
      order({ tokenQuantity: 99, statusCode: "EXPIRED" }),
      order({ tokenQuantity: 7, realEstateId: 2 }),
    ];
    expect(committedShares(orders, 1)).toBe(25);
    expect(
      maxSubscribable({ maxPerInvestor: 500, remaining: 9980, committed: 25 }),
    ).toBe(475);
    expect(maxSubscribable({ maxPerInvestor: 500, remaining: 10 })).toBe(10);
    expect(maxSubscribable({ maxPerInvestor: 10, committed: 12 })).toBe(0);
  });

  it("formats countdowns", () => {
    expect(formatCountdown(14 * 60_000 + 5_000)).toBe("14:05");
    expect(formatCountdown(3_725_000)).toBe("1:02:05");
    expect(formatCountdown(-1)).toBe("00:00");
  });
});

describe("investmentShareBounds", () => {
  it("converts investment amounts into whole-share bounds", () => {
    expect(
      investmentShareBounds({
        price: "500",
        minInvestment: "1200",
        maxInvestment: "10000.00",
      }),
    ).toEqual({ min: 3, max: 20 });
  });

  it("keeps decimals exact and ignores missing bounds", () => {
    expect(
      investmentShareBounds({ price: "0.1", minInvestment: "0.3" }),
    ).toEqual({ min: 3, max: null });
    expect(investmentShareBounds({ price: "500" })).toEqual({
      min: 1,
      max: null,
    });
    expect(investmentShareBounds({ price: "0", minInvestment: "100" })).toEqual(
      { min: 1, max: null },
    );
  });
});
