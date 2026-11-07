import Link from "next/link";
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
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="size-10 shrink-0 rounded-md bg-muted bg-cover bg-center ring-1 ring-border"
        style={
          asset.imageurl
            ? { backgroundImage: `url("${asset.imageurl}")` }
            : undefined
        }
        aria-hidden
      />
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
