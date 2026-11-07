import { expect, it } from "vitest";
import type { RealEstate } from "@/lib/api/types";
import { assetFieldLocks } from "./asset-locks";
import { assetToFormValues, buildPatchPayload } from "./asset-payload";

it("locks only fields confirmed by the token guard and keeps other patches", () => {
  const asset: RealEstate = {
    id: 7,
    title: "Original",
    token: { id: 42 },
    configuration: {
      total_shares: "100",
      price_per_share: "10",
      max_shares_per_investor: "5",
    },
  };
  const locks = assetFieldLocks(asset);
  expect(Object.keys(locks)).toEqual([
    "title",
    "configuration.total_shares",
    "configuration.max_shares_per_investor",
  ]);
  const initial = assetToFormValues(asset);
  const edited = structuredClone(initial);
  edited.title = "Renamed";
  edited.configuration.total_shares = "200";
  edited.configuration.max_shares_per_investor = "10";
  edited.configuration.price_per_share = "12";
  expect(buildPatchPayload(initial, edited, locks)).toEqual({
    configuration: { price_per_share: "12" },
  });
});

it("does not invent a total-share lock for a legacy token without a configuration", () => {
  expect(assetFieldLocks({ id: 1, token: { id: 2 } })).toEqual({
    title: expect.any(String),
  });
  expect(assetFieldLocks({ id: 1, progression: { tokens_sold: 5 } })).toEqual(
    {},
  );
});
