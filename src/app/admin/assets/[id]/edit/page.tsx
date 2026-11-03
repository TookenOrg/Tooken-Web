"use client";

import { Info } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { ErrorState, PageSkeleton } from "@/components/app/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorMessage } from "@/lib/api/client";
import { useRealEstate, useUpdateRealEstate } from "@/lib/api/hooks";
import { AssetForm } from "../../_components/asset-form";
import {
  type AssetFormValues,
  assetToFormValues,
  buildPatchPayload,
} from "../../_components/asset-payload";

export default function EditAssetPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const asset = useRealEstate(Number.isFinite(id) ? id : undefined);
  const update = useUpdateRealEstate(id);
  const initial = useMemo(
    () => (asset.data ? assetToFormValues(asset.data) : null),
    [asset.data],
  );

  if (asset.isLoading) return <PageSkeleton />;
  if (asset.isError || !asset.data || !initial) {
    return (
      <Panel>
        <ErrorState
          error={asset.error ?? new Error("Asset not found.")}
          onRetry={() => asset.refetch()}
        />
      </Panel>
    );
  }

  const re = asset.data;
  const tokenized = !!(re.token?.address ?? re.contract_address);

  const submit = async (values: AssetFormValues) => {
    const patch = buildPatchPayload(initial, values);
    if (Object.keys(patch).length === 0) {
      toast.info("No changes to save");
      return;
    }
    try {
      await update.mutateAsync(patch);
      toast.success("Changes saved");
      router.push(`/admin/assets/${id}`);
    } catch {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <PageHeader
        title={`Edit ${re.title ?? "asset"}`}
        description="Only the fields you modify are sent; everything else keeps its current value."
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
        cancelHref={`/admin/assets/${re.id}`}
        notice={
          <>
            {update.isError ? (
              <Alert variant="destructive">
                <AlertTitle>The changes were refused</AlertTitle>
                <AlertDescription>
                  {errorMessage(update.error)}
                </AlertDescription>
              </Alert>
            ) : null}
            {tokenized ? (
              <Alert>
                <Info />
                <AlertTitle>This asset is tokenized</AlertTitle>
                <AlertDescription>
                  Fields bound to the token or to existing orders, such as the
                  number of shares, can no longer change. Such edits are refused
                  by the platform.
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        }
      />
    </>
  );
}
