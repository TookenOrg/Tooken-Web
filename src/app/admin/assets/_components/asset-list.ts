import type { RealEstateSummary } from "@/lib/api/types";
import { compareDecimal } from "@/lib/format";
import { realEstateStatusMeta } from "@/lib/status";

export const ASSET_FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts & in review" },
  { id: "published", label: "Published" },
  { id: "fundraising", label: "Fundraising" },
  { id: "funded", label: "Funded & closed" },
  { id: "other", label: "Other" },
] as const;

export type AssetFilter = (typeof ASSET_FILTERS)[number]["id"];
export type AssetSortKey = "name" | "date" | "status" | "valuation";
export type SortDirection = "asc" | "desc";

export function matchesAssetFilter(
  status: string | undefined,
  filter: AssetFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "draft") return status === "draft" || status === "in_review";
  if (filter === "funded") return status === "funded" || status === "closed";
  if (filter === "other") {
    return ![
      "draft",
      "in_review",
      "published",
      "fundraising",
      "funded",
      "closed",
    ].includes(status ?? "");
  }
  return status === filter;
}

const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});
const DECIMAL = /^-?\d+(?:\.\d+)?$/;

function compareOptional<T>(
  a: T | undefined,
  b: T | undefined,
  compare: (left: T, right: T) => number,
  direction: SortDirection,
): number {
  if (a === undefined) return b === undefined ? 0 : 1;
  if (b === undefined) return -1;
  return compare(a, b) * (direction === "asc" ? 1 : -1);
}

function valuation(asset: RealEstateSummary): string | undefined {
  const amount = asset.configuration?.total_valuation;
  return amount && DECIMAL.test(amount) ? amount : undefined;
}

function created(asset: RealEstateSummary): number | undefined {
  const time = asset.created_at ? Date.parse(asset.created_at) : NaN;
  return Number.isNaN(time) ? undefined : time;
}

export function sortAssets(
  assets: RealEstateSummary[],
  key: AssetSortKey,
  direction: SortDirection,
): RealEstateSummary[] {
  return assets
    .map((asset, index) => ({ asset, index }))
    .sort((left, right) => {
      const a = left.asset;
      const b = right.asset;
      let result: number;
      if (key === "name") {
        result = compareOptional(
          a.title?.trim() || undefined,
          b.title?.trim() || undefined,
          collator.compare,
          direction,
        );
      } else if (key === "date") {
        result = compareOptional(
          created(a),
          created(b),
          (x, y) => x - y,
          direction,
        );
      } else if (key === "status") {
        result = compareOptional(
          a.status ? realEstateStatusMeta(a.status).label : undefined,
          b.status ? realEstateStatusMeta(b.status).label : undefined,
          collator.compare,
          direction,
        );
      } else {
        const currencyA = a.configuration?.currency_code?.trim().toUpperCase();
        const currencyB = b.configuration?.currency_code?.trim().toUpperCase();
        result = compareOptional(
          currencyA || undefined,
          currencyB || undefined,
          collator.compare,
          "asc",
        );
        if (result === 0 && currencyA && currencyB) {
          result = compareOptional(
            valuation(a),
            valuation(b),
            compareDecimal,
            direction,
          );
        }
      }
      return result || left.index - right.index;
    })
    .map(({ asset }) => asset);
}
