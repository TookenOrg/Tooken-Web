import { describe, expect, it } from "vitest";
import type { RealEstateSummary } from "@/lib/api/types";
import { matchesAssetFilter, sortAssets } from "./asset-list";

describe("asset status filters", () => {
  it("keeps in-review drafts, funded/closed and other states distinct", () => {
    expect(matchesAssetFilter("in_review", "draft")).toBe(true);
    expect(matchesAssetFilter("funded", "funded")).toBe(true);
    expect(matchesAssetFilter("closed", "funded")).toBe(true);
    expect(matchesAssetFilter("cancelled", "funded")).toBe(false);
    expect(matchesAssetFilter("cancelled", "other")).toBe(true);
    expect(matchesAssetFilter(undefined, "other")).toBe(true);
  });
});

describe("asset sorting", () => {
  it("sorts exact valuations only within a currency and preserves ties", () => {
    const assets: RealEstateSummary[] = [
      { id: 1, configuration: { currency_code: "USD", total_valuation: "1" } },
      {
        id: 2,
        configuration: {
          currency_code: "EUR",
          total_valuation: "9007199254740993.01",
        },
      },
      {
        id: 3,
        configuration: {
          currency_code: "EUR",
          total_valuation: "9007199254740993.00",
        },
      },
      {
        id: 4,
        configuration: {
          currency_code: "EUR",
          total_valuation: "9007199254740993.00",
        },
      },
      { id: 5, configuration: { currency_code: "EUR" } },
      { id: 6, configuration: { total_valuation: "500" } },
    ];
    expect(sortAssets(assets, "valuation", "asc").map((a) => a.id)).toEqual([
      3, 4, 2, 5, 1, 6,
    ]);
    expect(sortAssets(assets, "valuation", "desc").map((a) => a.id)).toEqual([
      2, 3, 4, 5, 1, 6,
    ]);
  });

  it("keeps missing dates last in both directions", () => {
    const assets: RealEstateSummary[] = [
      { id: 1 },
      { id: 2, created_at: "2025-01-01T00:00:00Z" },
      { id: 3, created_at: "2026-01-01T00:00:00Z" },
    ];
    expect(sortAssets(assets, "date", "desc").map((a) => a.id)).toEqual([
      3, 2, 1,
    ]);
    expect(sortAssets(assets, "date", "asc").map((a) => a.id)).toEqual([
      2, 3, 1,
    ]);
  });
});
