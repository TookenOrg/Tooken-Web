import { Building2 } from "lucide-react";
import Link from "next/link";
import { ImageWithLoader } from "@/components/app/image-with-loader";
import { estateCover } from "@/components/app/real-estate-card";
import type { RealEstateSummary } from "@/lib/api/types";
import { countryName, estateTypeLabel } from "@/lib/reference";

/** Thumbnail, name, type and city of an asset, for tables and lists. */
export function AssetCell({
  asset,
  linked,
}: {
  asset: RealEstateSummary;
  linked?: boolean;
}) {
  const title = asset.title || "Untitled asset";
  const cover = estateCover(asset);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted ring-1 ring-border"
        aria-hidden
      >
        {cover ? (
          <ImageWithLoader
            src={cover}
            alt=""
            fill
            sizes="40px"
            loaderSize={16}
            className="object-cover"
            fallback={<Building2 className="size-4 text-muted-foreground/45" />}
          />
        ) : (
          <Building2 className="size-4 text-muted-foreground/45" />
        )}
      </div>
      <div className="min-w-0">
        {linked ? (
          <Link
            href={`/admin/assets/${asset.id}`}
            title={title}
            className="block truncate font-medium text-ink hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {title}
          </Link>
        ) : (
          <p title={title} className="truncate font-medium text-ink">
            {title}
          </p>
        )}
        <p className="truncate text-xs text-muted-foreground">
          {estateTypeLabel(asset.estate_type, asset.estate_type_id)}
          {asset.location?.city
            ? ` · ${asset.location.city}, ${countryName(asset.location.country_code)}`
            : ""}
        </p>
      </div>
    </div>
  );
}
