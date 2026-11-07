"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { ErrorState, PageSkeleton } from "@/components/app/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorMessage } from "@/lib/api/client";
import { useRealEstate, useUpdateRealEstate } from "@/lib/api/hooks";
import type { RealEstate } from "@/lib/api/types";
import { missingFieldLabel, missingFieldsOf } from "@/lib/missing-fields";
import { AssetForm } from "../../_components/asset-form";
import { assetFieldLocks } from "../../_components/asset-locks";
import {
  type AssetFormValues,
  assetToFormValues,
  buildPatchPayload,
} from "../../_components/asset-payload";
import { assetFieldHref } from "../../_components/publication-readiness";

export default function EditAssetPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const asset = useRealEstate(Number.isFinite(id) ? id : undefined);

  if (asset.isLoading && !asset.data) return <PageSkeleton />;
  if (!asset.data) {
    return (
      <Panel>
        <ErrorState
          error={asset.error ?? new Error("Asset not found.")}
          onRetry={() => asset.refetch()}
        />
      </Panel>
    );
  }

  return (
    <EditAssetEditor
      key={asset.data.id}
      asset={asset.data}
      refreshError={asset.isError ? asset.error : undefined}
      onRetry={() => asset.refetch()}
    />
  );
}

function EditAssetEditor({
  asset: re,
  refreshError,
  onRetry,
}: {
  asset: RealEstate;
  refreshError?: unknown;
  onRetry: () => void;
}) {
  const update = useUpdateRealEstate(re.id);
  const [{ initial, locks }] = useState(() => ({
    initial: assetToFormValues(re),
    locks: assetFieldLocks(re),
  }));
  const tokenized = !!locks.title;
  const missing = missingFieldsOf(update.error);

  useEffect(() => {
    if (update.isError) {
      document.getElementById("asset-save-error")?.focus();
    }
  }, [update.isError]);

  const submit = async (values: AssetFormValues) => {
    const patch = buildPatchPayload(initial, values, locks);
    if (Object.keys(patch).length === 0) {
      toast.info("No changes to save");
      return `/admin/assets/${re.id}`;
    }
    try {
      await update.mutateAsync(patch);
      toast.success("Changes saved");
      return `/admin/assets/${re.id}`;
    } catch {
      return undefined;
    }
  };

  return (
    <>
      <PageHeader
        title={`Edit ${re.title ?? "asset"}`}
        description="Review the offering and update the details that are still editable."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Assets", href: "/admin/assets" },
          { label: re.title || `#${re.id}`, href: `/admin/assets/${re.id}` },
          { label: "Edit" },
        ]}
      />
      <AssetForm
        key={re.id}
        mode="edit"
        defaultValues={initial}
        onSubmit={submit}
        submitting={update.isPending}
        locks={locks}
        cancelHref={`/admin/assets/${re.id}`}
        notice={
          <>
            {refreshError ? (
              <Alert variant="destructive">
                <AlertTitle>Latest asset details are unavailable</AlertTitle>
                <AlertDescription>
                  Your entries remain in the form.{" "}
                  <button type="button" className="underline" onClick={onRetry}>
                    Retry
                  </button>
                </AlertDescription>
              </Alert>
            ) : null}
            {update.isError ? (
              <Alert id="asset-save-error" tabIndex={-1} variant="destructive">
                <AlertTitle>The changes were refused</AlertTitle>
                <AlertDescription>
                  <p>{errorMessage(update.error)}</p>
                  {missing.length ? (
                    <ul className="mt-2 list-disc pl-5">
                      {missing.map((field) => (
                        <li key={field}>
                          <Link
                            href={assetFieldHref(re.id, field, re.issuer?.id)}
                            className="underline"
                          >
                            {missingFieldLabel(field)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-2">
                    Your entries are preserved. The record may have changed;{" "}
                    <Link
                      href={`/admin/assets/${re.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      review the current asset
                    </Link>{" "}
                    before retrying.
                  </p>
                </AlertDescription>
              </Alert>
            ) : null}
            {tokenized ? (
              <Alert>
                <Info />
                <AlertTitle>This asset is tokenized</AlertTitle>
                <AlertDescription>
                  The name and the indicated share fields are fixed by the
                  token. Other changes remain subject to the server&apos;s
                  current checks, including any reserved shares.
                  {!locks["configuration.total_shares"] ? (
                    <span className="mt-2 block">
                      The share configuration is missing from this record. The
                      server will validate share changes before saving.
                    </span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        }
      />
    </>
  );
}
