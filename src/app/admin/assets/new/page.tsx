"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorMessage } from "@/lib/api/client";
import { useCreateRealEstate } from "@/lib/api/hooks";
import { AssetForm } from "../_components/asset-form";
import {
  type AssetFormValues,
  buildCreatePayload,
  emptyAssetValues,
} from "../_components/asset-payload";

export default function NewAssetPage() {
  const router = useRouter();
  const create = useCreateRealEstate();
  const [defaults] = useState(emptyAssetValues);

  const submit = async (values: AssetFormValues) => {
    try {
      const re = await create.mutateAsync(buildCreatePayload(values));
      toast.success("Draft created", {
        description: `${re.title} can now be reviewed and published.`,
      });
      router.push(`/admin/assets/${re.id}`);
    } catch {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <PageHeader
        title="New asset"
        description="Describe the property and its share economics. The asset is saved as a draft until you publish it."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Assets", href: "/admin/assets" },
          { label: "New" },
        ]}
      />
      <AssetForm
        mode="create"
        defaultValues={defaults}
        onSubmit={submit}
        submitting={create.isPending}
        cancelHref="/admin/assets"
        notice={
          create.isError ? (
            <Alert variant="destructive">
              <AlertTitle>The asset could not be created</AlertTitle>
              <AlertDescription>{errorMessage(create.error)}</AlertDescription>
            </Alert>
          ) : null
        }
      />
    </>
  );
}
