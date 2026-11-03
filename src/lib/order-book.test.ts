import { describe, expect, it } from "vitest";
import type { IssuanceOrder, KycVerification } from "@/lib/api/types";
import {
  bucketCounts,
  filterOrders,
  investorDirectory,
  isReservationLapsed,
  orderBucket,
  sortOrders,
  totalsByCurrency,
} from "./order-book";

function order(over: Partial<IssuanceOrder>): IssuanceOrder {
  return {
    userId: 3,
    orderRef: "ISS-20261102-AAAAAA",
    tokenQuantity: 20,
    realEstateId: 1,
    statusCode: "AWAITING_PAYMENT",
    unitPrice: "250.00000000",
    currencyCode: "EUR",
    grossAmount: "5000.00",
    amountDue: "5100.00",
    feeAmount: "100.00",
    fees: [],
    reservationExpiresAt: "2026-11-02T19:15:00Z",
    createdAt: "2026-11-02T19:00:00Z",
    updatedAt: "2026-11-02T19:00:00Z",
    realEstateTitle: "Résidence Kirchberg",
    ...over,
  };
}

const orders = [
  order({ orderRef: "ISS-A", statusCode: "AWAITING_PAYMENT" }),
  order({ orderRef: "ISS-B", statusCode: "DELIVERY_IN_PROGRESS" }),
  order({ orderRef: "ISS-C", statusCode: "CLOSED", userId: 7 }),
  order({ orderRef: "ISS-D", statusCode: "EXPIRED" }),
  order({ orderRef: "ISS-E", statusCode: "SOMETHING_NEW" }),
];

describe("orderBucket", () => {
  it("routes statuses to the operator's next action", () => {
    expect(orderBucket("CREATED")).toBe("awaiting");
    expect(orderBucket("PAYMENT_CONFIRMED")).toBe("settlement");
    expect(orderBucket("DELIVERED")).toBe("settlement");
    expect(orderBucket("CLOSED")).toBe("settled");
    expect(orderBucket("DELIVERY_FAILED")).toBe("exceptions");
    expect(orderBucket("REFUNDED")).toBe("exceptions");
  });

  it("never hides unknown statuses", () => {
    expect(orderBucket("SOMETHING_NEW")).toBe("exceptions");
    expect(orderBucket(undefined)).toBe("exceptions");
  });
});

describe("bucketCounts", () => {
  it("counts each bucket and the total", () => {
    expect(bucketCounts(orders)).toEqual({
      awaiting: 1,
      settlement: 1,
      settled: 1,
      exceptions: 2,
      all: 5,
    });
  });
});

describe("filterOrders", () => {
  const investors = investorDirectory([
    {
      id: 9,
      user_id: 7,
      status: "approved",
      declared_full_name: "Marc Dupont",
      declared_country_code: "FR",
      email: "marc@bank.fr",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ]);

  it("filters by bucket", () => {
    expect(
      filterOrders(orders, { bucket: "exceptions" }).map((o) => o.orderRef),
    ).toEqual(["ISS-D", "ISS-E"]);
  });

  it("searches reference, investor e-mail and asset title", () => {
    expect(filterOrders(orders, { query: "iss-c" })).toHaveLength(1);
    expect(
      filterOrders(orders, { query: "MARC@", investors }).map(
        (o) => o.orderRef,
      ),
    ).toEqual(["ISS-C"]);
    expect(
      filterOrders([order({ realEstateTitle: undefined, realEstateId: 4 })], {
        query: "harbour",
        assetTitles: new Map([[4, "Harbour Lofts"]]),
      }),
    ).toHaveLength(1);
  });

  it("combines bucket and query", () => {
    expect(
      filterOrders(orders, { bucket: "awaiting", query: "ISS-C", investors }),
    ).toHaveLength(0);
  });
});

describe("investorDirectory", () => {
  it("keeps the most recent filing of each user", () => {
    const base: Omit<KycVerification, "id" | "submitted_at" | "email"> = {
      user_id: 3,
      status: "approved",
      declared_full_name: "Claire Investor",
      declared_country_code: "LU",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const dir = investorDirectory([
      {
        ...base,
        id: 2,
        email: "new@x.lu",
        submitted_at: "2026-06-01T00:00:00Z",
      },
      {
        ...base,
        id: 1,
        email: "old@x.lu",
        submitted_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(dir.get(3)).toMatchObject({ kycId: 2, email: "new@x.lu" });
  });
});

describe("totalsByCurrency", () => {
  it("adds amounts exactly, per currency", () => {
    expect(
      totalsByCurrency([
        order({ amountDue: "0.10" }),
        order({ amountDue: "0.20" }),
        order({ amountDue: "100.05", currencyCode: "CHF" }),
        order({ amountDue: "9007199254740993.01" }),
      ]),
    ).toEqual([
      { currency: "CHF", amount: "100.05" },
      { currency: "EUR", amount: "9007199254740993.31" },
    ]);
  });

  it("skips malformed amounts and handles empty lists", () => {
    expect(totalsByCurrency([order({ amountDue: "n/a" })])).toEqual([]);
    expect(totalsByCurrency([])).toEqual([]);
  });
});

describe("sortOrders", () => {
  it("puts the newest order first", () => {
    expect(
      sortOrders([
        order({ orderRef: "old", createdAt: "2026-01-01T00:00:00Z" }),
        order({ orderRef: "new", createdAt: "2026-02-01T00:00:00Z" }),
      ]).map((o) => o.orderRef),
    ).toEqual(["new", "old"]);
  });
});

describe("isReservationLapsed", () => {
  const now = new Date("2026-11-02T19:20:00Z").getTime();
  it("flags unpaid orders past their reservation", () => {
    expect(isReservationLapsed(order({}), now)).toBe(true);
    expect(
      isReservationLapsed(
        order({ reservationExpiresAt: "2026-11-02T19:30:00Z" }),
        now,
      ),
    ).toBe(false);
  });

  it("ignores orders that are no longer awaiting payment", () => {
    expect(isReservationLapsed(order({ statusCode: "CLOSED" }), now)).toBe(
      false,
    );
  });
});
