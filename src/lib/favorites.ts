"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ApiError } from "@/lib/api/client";
import { usersApi } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/hooks";
import type { RealEstateSummary } from "@/lib/api/types";

/** The user's watchlist, as stored by the backend. */
export function useFavorites(userId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.favorites(userId ?? 0),
    queryFn: () => usersApi.favorites(userId as number),
    enabled: typeof userId === "number" && userId > 0,
  });
}

const EMPTY: number[] = [];

export function useFavoriteIds(userId: number | undefined): number[] {
  const { data } = useFavorites(userId);
  return useMemo(() => (data ? data.map((e) => e.id) : EMPTY), [data]);
}

/** Adds or removes a favorite; an already-settled state counts as success. */
export async function setFavorite(
  userId: number,
  realEstateId: number,
  favorite: boolean,
) {
  try {
    if (favorite) await usersApi.addFavorite(userId, realEstateId);
    else await usersApi.removeFavorite(userId, realEstateId);
  } catch (error) {
    // 409 on add means "already a favorite", 404 on remove means "was not one":
    // both leave the backend in the requested state.
    const settled =
      error instanceof ApiError &&
      ((favorite && error.status === 409) ||
        (!favorite && error.status === 404));
    if (!settled) throw error;
  }
}

export function useFavorite(userId: number | undefined, realEstateId: number) {
  const qc = useQueryClient();
  const ids = useFavoriteIds(userId);
  const isFavorite = ids.includes(realEstateId);

  const toggle = useCallback(async () => {
    if (!userId) return;
    const key = queryKeys.favorites(userId);
    const previous = qc.getQueryData<RealEstateSummary[]>(key);
    // Optimistic heart: removal is applied at once, addition waits for the
    // refetch because the list needs the full summary of the asset.
    if (isFavorite && previous) {
      qc.setQueryData(
        key,
        previous.filter((e) => e.id !== realEstateId),
      );
    }
    try {
      await setFavorite(userId, realEstateId, !isFavorite);
    } catch (error) {
      if (previous) qc.setQueryData(key, previous);
      throw error;
    } finally {
      await qc.invalidateQueries({ queryKey: key });
    }
  }, [qc, userId, realEstateId, isFavorite]);

  return { isFavorite, toggle };
}
