"use client";

import { useQueries } from "@tanstack/react-query";
import { realEstateApi } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/hooks";
import type { RealEstate } from "@/lib/api/types";

/**
 * The listing omits the issuer of each asset, so staff screens that need it
 * load the details. They share the detail cache with useRealEstate(id).
 */
export function useAssetDetails(ids: number[]) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.realEstate(id),
      queryFn: () => realEstateApi.get(id),
      staleTime: 30_000,
    })),
  });
  const byId = new Map<number, RealEstate>();
  for (const r of results) {
    if (r.data) byId.set(r.data.id, r.data);
  }
  return {
    byId,
    isLoading: results.some((r) => r.isLoading),
  };
}
