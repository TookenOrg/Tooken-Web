"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session-context";
import { useFavorite } from "@/lib/favorites";
import { cn } from "@/lib/utils";

/** Watchlist toggle. Anonymous visitors are sent to sign-in first. */
export function FavoriteButton({
  realEstateId,
  className,
  withLabel,
}: {
  realEstateId: number;
  className?: string;
  withLabel?: boolean;
}) {
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const { isFavorite, toggle } = useFavorite(user?.id, realEstateId);
  const [pending, setPending] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push(
        `/sign-in?callbackUrl=${encodeURIComponent(`/real-estate/${realEstateId}`)}`,
      );
      return;
    }
    if (!user) return;
    setPending(true);
    try {
      await toggle();
      toast.success(
        isFavorite ? "Removed from your watchlist" : "Added to your watchlist",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-white/90 p-2 text-sm font-medium text-ink shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60",
        withLabel && "px-3.5",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-4",
          isFavorite ? "fill-red-500 text-red-500" : "text-ink/60",
        )}
        aria-hidden
      />
      {withLabel ? (isFavorite ? "In watchlist" : "Add to watchlist") : null}
    </button>
  );
}
