import { describe, expect, it } from "vitest";
import type { KycVerification } from "@/lib/api/types";
import {
  defaultKycExpiry,
  expiryDateToIso,
  filterKycFiles,
  isKycExpired,
  kycTabCounts,
  needsOnChainSync,
  sortKycFiles,
} from "./kyc-review";

function file(over: Partial<KycVerification>): KycVerification {
  return {
    id: 1,
    user_id: 3,
    status: "submitted",
    declared_full_name: "Claire Investor",
    declared_country_code: "LU",
    email: "claire@invest.lu",
    created_at: "2026-11-02T18:00:00Z",
    updated_at: "2026-11-02T18:00:00Z",
    submitted_at: "2026-11-02T18:00:00Z",
    ...over,
  };
}

const files = [
  file({ id: 1, status: "submitted", submitted_at: "2026-11-02T10:00:00Z" }),
  file({ id: 2, status: "submitted", submitted_at: "2026-11-01T10:00:00Z" }),
  file({ id: 3, status: "approved", email: "marc@bank.fr" }),
  file({ id: 4, status: "rejected" }),
];

describe("kyc review queue", () => {
  it("counts files per tab", () => {
    expect(kycTabCounts(files)).toEqual({
      submitted: 2,
      approved: 1,
      rejected: 1,
      revoked: 0,
      all: 4,
    });
  });

  it("filters by tab and query", () => {
    expect(filterKycFiles(files, { tab: "submitted" })).toHaveLength(2);
    expect(filterKycFiles(files, { query: "MARC" }).map((f) => f.id)).toEqual([
      3,
    ]);
  });

  it("works the review queue oldest first", () => {
    const queue = sortKycFiles(
      filterKycFiles(files, { tab: "submitted" }),
      "submitted",
    );
    expect(queue.map((f) => f.id)).toEqual([2, 1]);
  });
});

describe("needsOnChainSync", () => {
  it("is true for approved files not yet verified on-chain", () => {
    expect(
      needsOnChainSync(file({ status: "approved", kyc_status: "approved" })),
    ).toBe(true);
    expect(
      needsOnChainSync(file({ status: "approved", kyc_status: "verified" })),
    ).toBe(false);
  });

  it("is unknown when the user status is not returned", () => {
    expect(needsOnChainSync(file({ status: "approved" }))).toBeUndefined();
    expect(needsOnChainSync(file({ status: "rejected" }))).toBe(false);
  });
});

describe("expiry helpers", () => {
  it("defaults to one year ahead", () => {
    expect(defaultKycExpiry(new Date("2026-11-02T20:00:00Z"))).toBe(
      "2027-11-02",
    );
  });

  it("converts a date input to ISO and rejects garbage", () => {
    expect(expiryDateToIso("2027-11-02")).toBe("2027-11-02T00:00:00.000Z");
    expect(expiryDateToIso("02/11/2027")).toBeNull();
  });

  it("detects expired approvals", () => {
    const now = new Date("2027-11-03T00:00:00Z").getTime();
    expect(
      isKycExpired(file({ expires_at: "2027-11-02T00:00:00Z" }), now),
    ).toBe(true);
    expect(isKycExpired(file({}), now)).toBe(false);
  });
});
