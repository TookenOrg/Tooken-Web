"use client";

import { Heart, Store } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { RealEstateCard } from "@/components/app/real-estate-card";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth/session-context";
import { useFavorites } from "@/lib/favorites";

export default function FavoritesPage() {
  const { user, userLoading, refreshUser } = useSession();
  const favorites = useFavorites(user?.id);
  const watched = favorites.data ?? [];

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

      {favorites.isError ? (
        <Panel>
          <ErrorState
            error={favorites.error}
            onRetry={() => favorites.refetch()}
          />
        </Panel>
      ) : userLoading || (user && favorites.isLoading) ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : !user ? (
        <Panel>
          <ErrorState
            title="Watchlist unavailable"
            error={new Error("Account details could not be loaded.")}
            onRetry={() => refreshUser()}
          />
        </Panel>
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
