"use client";

import Link from "next/link";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { useIssuer } from "@/lib/api/hooks";
import type { RealEstate } from "@/lib/api/types";
import { missingFieldLabel } from "@/lib/missing-fields";

export function assetFieldHref(
  assetId: number,
  field: string,
  issuerId?: number,
): string {
  if (field === "registration_number" && issuerId) {
    return `/admin/issuers/${issuerId}`;
  }
  const section = assetFieldSection(field);
  return `/admin/assets/${assetId}/edit${section ? `#${section}` : ""}`;
}

export function assetFieldSection(field: string): string | undefined {
  return field === "media" || field === "imageurl" || field.startsWith("media.")
    ? "media"
    : field.startsWith("configuration.")
      ? "configuration"
      : field.startsWith("address.")
        ? "address"
        : field.startsWith("specification.")
          ? "specification"
          : [
                "title",
                "description",
                "estate_type_id",
                "issuer",
                "issuer_id",
              ].includes(field)
            ? "general"
            : undefined;
}

export function PublicationReadiness({
  asset,
  missingFields,
  publicationFailed,
}: {
  asset: RealEstate;
  missingFields: string[];
  publicationFailed: boolean;
}) {
  const issuer = useIssuer(asset.issuer?.id);
  const issues: { field: string; label: string }[] = [];

  if (!asset.description?.trim()) {
    issues.push({ field: "description", label: "Description not provided" });
  }
  if (!asset.imageurl && !asset.media?.some((item) => item.url)) {
    issues.push({ field: "media", label: "No visual found" });
  }
  const configuration = asset.configuration;
  for (const [field, value] of [
    ["configuration.total_shares", configuration?.total_shares],
    ["configuration.price_per_share", configuration?.price_per_share],
    ["configuration.currency_code", configuration?.currency_code],
    ["configuration.payment_frequency", configuration?.payment_frequency],
    [
      "configuration.payment_frequency_type_id",
      configuration?.payment_frequency_type_id,
    ],
  ] as const) {
    if (value === undefined || value === null || value === "") {
      issues.push({
        field,
        label: `${missingFieldLabel(field)} not provided`,
      });
    }
  }

  const issuerReady =
    !!asset.issuer?.id &&
    !issuer.isError &&
    !issuer.isFetching &&
    issuer.data?.status === "active";
  const ready =
    issues.length === 0 &&
    issuerReady &&
    missingFields.length === 0 &&
    !publicationFailed;

  return (
    <Panel>
      <PanelHeader
        title="Publication readiness"
        description="A preliminary review of the stored asset; the server makes the final decision."
      />
      <PanelBody className="space-y-4 text-sm">
        <p className="font-medium text-ink">
          {ready ? "Ready for review" : "Review before publication"}
        </p>
        <div>
          <p className="font-medium text-ink">Issuer</p>
          {!asset.issuer?.id ? (
            <p className="text-muted-foreground">
              No issuer is attached.{" "}
              <Link
                href={assetFieldHref(asset.id, "issuer_id")}
                className="underline"
              >
                Choose an issuer
              </Link>
              .
            </p>
          ) : issuer.isLoading || issuer.isFetching ? (
            <p className="text-muted-foreground">Checking issuer status…</p>
          ) : issuer.isError || !issuer.data ? (
            <div className="text-muted-foreground">
              <p>Current issuer status is unavailable.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => issuer.refetch()}
              >
                Retry issuer status
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              <Link
                href={`/admin/issuers/${issuer.data.id}`}
                className="font-medium text-ink underline"
              >
                {issuer.data.name}
              </Link>{" "}
              — {issuer.data.status}.{" "}
              {issuerReady
                ? "The issuer is active."
                : "An active issuer is required to publish."}
            </p>
          )}
        </div>

        {issues.length ? (
          <div>
            <p className="font-medium text-ink">Fields to review</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {issues.map((issue) => (
                <li key={issue.field}>
                  <Link
                    href={assetFieldHref(asset.id, issue.field)}
                    className="underline"
                  >
                    {issue.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Description, visual and basic share configuration are present.
          </p>
        )}

        {missingFields.length ? (
          <div>
            <p className="font-medium text-red-700">
              Fields requested by the server
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {missingFields.map((field) => (
                <li key={field}>
                  <Link
                    href={assetFieldHref(asset.id, field, asset.issuer?.id)}
                    className="underline"
                  >
                    {missingFieldLabel(field)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          These checks are not a publication verdict. The server rechecks the
          current record and may request additional fields or refuse the
          transition.
        </p>
      </PanelBody>
    </Panel>
  );
}
