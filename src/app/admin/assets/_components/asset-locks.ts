import type { RealEstate } from "@/lib/api/types";

export type LockedAssetField =
  | "title"
  | "configuration.total_shares"
  | "configuration.max_shares_per_investor";

export type AssetFieldLocks = Partial<Record<LockedAssetField, string>>;

export function assetFieldLocks(asset: RealEstate): AssetFieldLocks {
  const tokenized = asset.token != null || !!asset.contract_address;
  if (!tokenized) return {};

  const locks: AssetFieldLocks = {
    title: "The asset name is fixed by the deployed token.",
  };
  if (asset.configuration?.total_shares) {
    locks["configuration.total_shares"] =
      "The share count is fixed by the deployed token.";
    locks["configuration.max_shares_per_investor"] =
      "The per-investor cap is fixed by the deployed token, including when no cap was set.";
  }
  return locks;
}
