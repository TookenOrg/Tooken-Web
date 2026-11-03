"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ApiError } from "@/lib/api/client";
import { usersApi } from "@/lib/api/endpoints";

/**
 * The API can add and remove favorites but cannot list them, so the set is
 * mirrored in localStorage per user to render hearts and the watchlist.
 */
const KEY = (userId: number) => `tooken:favorites:${userId}`;
const listeners = new Set<() => void>();
const cache = new Map<number, number[]>();

function read(userId: number): number[] {
  const cached = cache.get(userId);
  if (cached) return cached;
  let ids: number[] = [];
  try {
    const raw = window.localStorage.getItem(KEY(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    ids = Array.isArray(parsed)
      ? parsed.filter((n) => Number.isInteger(n))
      : [];
  } catch {
    ids = [];
  }
  cache.set(userId, ids);
  return ids;
}

function write(userId: number, ids: number[]) {
  const unique = Array.from(new Set(ids));
  cache.set(userId, unique);
  try {
    window.localStorage.setItem(KEY(userId), JSON.stringify(unique));
  } catch {
    // Storage may be unavailable (private mode): the in-memory copy still works.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const EMPTY: number[] = [];

export function useFavoriteIds(userId: number | undefined): number[] {
  return useSyncExternalStore(
    subscribe,
    () => (userId ? read(userId) : EMPTY),
    () => EMPTY,
  );
}

/** Adds or removes a favorite on the backend and mirrors the result locally. */
export async function setFavorite(
  userId: number,
  realEstateId: number,
  favorite: boolean,
) {
  const current = read(userId);
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
  write(
    userId,
    favorite
      ? [...current, realEstateId]
      : current.filter((id) => id !== realEstateId),
  );
}

export function useFavorite(userId: number | undefined, realEstateId: number) {
  const ids = useFavoriteIds(userId);
  const isFavorite = ids.includes(realEstateId);
  const toggle = useCallback(async () => {
    if (!userId) return;
    await setFavorite(userId, realEstateId, !isFavorite);
  }, [userId, realEstateId, isFavorite]);
  return { isFavorite, toggle };
}
