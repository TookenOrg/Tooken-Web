"use client";

import { Heart, Store } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { RealEstateCard } from "@/components/app/real-estate-card";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealEstates } from "@/lib/api/hooks";
import { useSession } from "@/lib/auth/session-context";
import { useFavoriteIds } from "@/lib/favorites";

export default function FavoritesPage() {
  const { user } = useSession();
  const ids = useFavoriteIds(user?.id);
  const estates = useRealEstates();

  const watched = useMemo(() => {
    const byId = new Map((estates.data ?? []).map((e) => [e.id, e]));
    return ids.flatMap((id) => {
      const e = byId.get(id);
      return e ? [e] : [];
    });
  }, [ids, estates.data]);
  // Favorites no longer listed in the catalogue (withdrawn offerings).
  const unavailable = estates.data ? ids.length - watched.length : 0;

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Watchlist" },
        ]}
        title="Watchlist"
        description="Offerings you follow. Add or remove them with the heart icon on any offering."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/explore">
              <Store /> Marketplace
            </Link>
          </Button>
        }
      />

      {estates.isError ? (
        <Panel>
          <ErrorState error={estates.error} onRetry={() => estates.refetch()} />
        </Panel>
      ) : estates.isLoading || !user ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : watched.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Heart}
            title="Your watchlist is empty"
            description="Follow offerings from the marketplace to keep an eye on their funding progress."
            action={
              <Button
                asChild
                className="bg-brand text-brand-foreground hover:bg-brand-light"
              >
                <Link href="/explore">Explore offerings</Link>
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground tabular">
            {watched.length} offering{watched.length === 1 ? "" : "s"} followed
            {unavailable > 0 ? ` · ${unavailable} no longer available` : ""}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {watched.map((e) => (
              <RealEstateCard key={e.id} estate={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
