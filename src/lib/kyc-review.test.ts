import { describe, expect, it } from "vitest";
import type { KycVerification } from "@/lib/api/types";
import {
  defaultKycExpiry,
  expiryDateToIso,
  filterKycFiles,
  investorVerificationState,
  isKycExpired,
  kycTabCounts,
  needsOnChainSync,
  registryVerdict,
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

  it("places unknown submission dates last, with deterministic ties", () => {
    const queue = sortKycFiles(
      [
        file({ id: 4, submitted_at: undefined }),
        file({ id: 3, submitted_at: "invalid" }),
        file({ id: 2, submitted_at: "2026-11-01T10:00:00Z" }),
        file({ id: 1, submitted_at: "2026-11-01T10:00:00Z" }),
      ],
      "submitted",
    );
    expect(queue.map((item) => item.id)).toEqual([1, 2, 3, 4]);
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
    expect(expiryDateToIso("2027-02-31")).toBeNull();
  });

  it("detects expired approvals", () => {
    const now = new Date("2027-11-03T00:00:00Z").getTime();
    expect(
      isKycExpired(file({ expires_at: "2027-11-02T00:00:00Z" }), now),
    ).toBe(true);
    expect(isKycExpired(file({}), now)).toBe(false);
  });
});

describe("investor verification and registry", () => {
  const now = Date.parse("2026-11-06T12:00:00Z");
  const future = "2027-11-06T00:00:00Z";

  it("treats errors, malformed verdicts and another user's result as unavailable", () => {
    const data = { user_id: 3, is_verified: true };
    expect(
      registryVerdict(data, { userId: 3, loading: false, error: false }),
    ).toBe("verified");
    expect(
      registryVerdict(data, { userId: 3, loading: false, error: true }),
    ).toBe("unavailable");
    expect(
      registryVerdict(data, { userId: 4, loading: false, error: false }),
    ).toBe("unavailable");
    expect(
      registryVerdict(undefined, { userId: 3, loading: true, error: false }),
    ).toBe("checking");
    expect(
      registryVerdict(
        { user_id: 3, is_verified: undefined as unknown as boolean },
        { userId: 3, loading: false, error: false },
      ),
    ).toBe("unavailable");
  });

  it("does not mistake approval, a stale account status or missing validity for readiness", () => {
    const state = (
      status: string | undefined,
      registry: Parameters<typeof investorVerificationState>[0]["registry"],
      expiresAt: string | null = future,
    ) => investorVerificationState({ status, registry, expiresAt }, now);

    expect(state("none", "not_verified")).toEqual({
      kind: "required",
      canFile: true,
    });
    expect(state("pending", "not_verified").kind).toBe("under_review");
    expect(state("approved", "not_verified").kind).toBe("registration_pending");
    expect(state("verified", "verified").kind).toBe("ready");
    expect(state("verified", "not_verified").kind).toBe("conflict");
    expect(state("approved", "verified").kind).toBe("conflict");
    expect(state("verified", "unavailable").kind).toBe("unavailable");
    expect(state("verified", "verified", null).kind).toBe("unavailable");
    expect(state(undefined, "not_verified").kind).toBe("unavailable");
    expect(state("rejected", "not_verified").canFile).toBe(true);
    expect(state("revoked", "not_verified").canFile).toBe(true);
    expect(state("expired", "not_verified").kind).toBe("renewal");
    expect(state("verified", "verified", "2026-11-01T00:00:00Z")).toEqual({
      kind: "conflict",
      canFile: true,
    });
  });
});
