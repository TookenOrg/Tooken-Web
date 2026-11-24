"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PageSkeleton } from "@/components/app/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/client";
import { useCreateRealEstate, useIssuer } from "@/lib/api/hooks";
import type { Issuer } from "@/lib/api/types";
import { missingFieldLabel, missingFieldsOf } from "@/lib/missing-fields";
import { AssetForm } from "../_components/asset-form";
import {
  type AssetFormValues,
  buildCreatePayload,
  emptyAssetValues,
} from "../_components/asset-payload";
import { parseIssuerContext } from "../_components/issuer-context";
import { assetFieldSection } from "../_components/publication-readiness";

export default function NewAssetPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewAssetContext />
    </Suspense>
  );
}

function NewAssetContext() {
  const searchParams = useSearchParams();
  const context = parseIssuerContext(searchParams.getAll("issuerId"));
  const issuer = useIssuer(context.kind === "id" ? context.id : undefined);
  const [manual, setManual] = useState(false);

  if (context.kind === "id" && !manual && !issuer.data) {
    if (issuer.isLoading) return <PageSkeleton />;
    return (
      <div className="space-y-4">
        <PageHeader title="New asset" />
        <Alert variant="destructive">
          <AlertTitle>Issuer context could not be verified</AlertTitle>
          <AlertDescription>
            {errorMessage(issuer.error)} Retry or choose an issuer manually.
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => issuer.refetch()}>
            Retry
          </Button>
          <Button variant="outline" onClick={() => setManual(true)}>
            Choose issuer manually
          </Button>
        </div>
      </div>
    );
  }

  const validIssuer =
    !manual &&
    context.kind === "id" &&
    issuer.data?.id === context.id &&
    ["draft", "active", "suspended"].includes(issuer.data.status)
      ? issuer.data
      : undefined;
  const warning =
    context.kind === "invalid"
      ? "The issuer link is invalid. Choose an issuer from the list."
      : context.kind === "id" && !manual && !validIssuer
        ? "This issuer cannot be used for a new asset. Choose another issuer."
        : issuer.isError && validIssuer
          ? "The issuer could not be refreshed. The server will recheck it when saving."
          : undefined;

  return (
    <NewAssetForm
      contextIssuer={validIssuer}
      contextWarning={warning}
      currentIssuer={issuer.data}
    />
  );
}

function NewAssetForm({
  contextIssuer,
  contextWarning,
  currentIssuer,
}: {
  contextIssuer?: Issuer;
  contextWarning?: string;
  currentIssuer?: Issuer;
}) {
  const create = useCreateRealEstate();
  const [defaults] = useState(() => ({
    ...emptyAssetValues(),
    issuer_id: contextIssuer ? String(contextIssuer.id) : "",
  }));
  const [issuerError, setIssuerError] = useState<string>();
  const missing = missingFieldsOf(create.error);

  useEffect(() => {
    if (create.isError) {
      document.getElementById("asset-create-error")?.focus();
    } else if (issuerError) {
      document.getElementById("asset-context-error")?.focus();
    }
  }, [create.isError, issuerError]);

  const submit = async (values: AssetFormValues) => {
    if (
      currentIssuer?.id === Number(values.issuer_id) &&
      currentIssuer.status === "dissolved"
    ) {
      setIssuerError("This issuer is dissolved. Choose another issuer.");
      return undefined;
    }
    setIssuerError(undefined);
    try {
      const re = await create.mutateAsync(buildCreatePayload(values));
      toast.success("Draft created", {
        description: `${re.title} can now be reviewed and published.`,
      });
      return `/admin/assets/${re.id}`;
    } catch {
      return undefined;
    }
  };

  return (
    <>
      <PageHeader
        title="New asset"
        description="The asset is saved as a draft until you publish it."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Assets", href: "/admin/assets" },
          { label: "New" },
        ]}
      />
      <AssetForm
        mode="create"
        defaultValues={defaults}
        contextIssuer={contextIssuer}
        onSubmit={submit}
        submitting={create.isPending}
        cancelHref="/admin/assets"
        notice={
          <>
            {contextWarning || issuerError ? (
              <Alert id="asset-context-error" tabIndex={-1}>
                <AlertTitle>Issuer context</AlertTitle>
                <AlertDescription>
                  {issuerError ?? contextWarning}
                </AlertDescription>
              </Alert>
            ) : null}
            {create.isError ? (
              <Alert
                id="asset-create-error"
                tabIndex={-1}
                variant="destructive"
              >
                <AlertTitle>The asset could not be created</AlertTitle>
                <AlertDescription>
                  <p>
                    {errorMessage(create.error)} Your entries are preserved.
                  </p>
                  {missing.length ? (
                    <ul className="mt-2 list-disc pl-5">
                      {missing.map((field) => {
                        const section = assetFieldSection(field);
                        return (
                          <li key={field}>
                            {section ? (
                              <a href={`#${section}`} className="underline">
                                {missingFieldLabel(field)}
                              </a>
                            ) : (
                              missingFieldLabel(field)
                            )}
                          </li>
                        );
                      })}
                    </ul>
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
