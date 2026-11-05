"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorMessage } from "@/lib/api/client";
import { useCreateIssuer } from "@/lib/api/hooks";
import {
  buildIssuerCreate,
  IssuerForm,
  type IssuerFormValues,
  issuerToFormValues,
} from "../_components/issuer-form";

export default function NewIssuerPage() {
  const router = useRouter();
  const create = useCreateIssuer();
  const [defaults] = useState(() => issuerToFormValues());

  const submit = async (values: IssuerFormValues) => {
    try {
      const issuer = await create.mutateAsync(buildIssuerCreate(values));
      toast.success("Issuer created", { description: issuer.name });
      router.push(`/admin/issuers/${issuer.id}`);
    } catch {
      // Rendered below from create.error.
    }
  };

  return (
    <>
      <PageHeader
        title="New issuer"
        description="Register the legal vehicle whose shares will be tokenized."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Issuers", href: "/admin/issuers" },
          { label: "New" },
        ]}
      />
      <div className="max-w-3xl space-y-4">
        {create.isError ? (
          <Alert variant="destructive">
            <AlertTitle>The issuer could not be created</AlertTitle>
            <AlertDescription>{errorMessage(create.error)}</AlertDescription>
          </Alert>
        ) : null}
        <Panel>
          <PanelHeader
            title="Legal identity"
            description="As registered with the trade and companies register."
          />
          <PanelBody>
            <IssuerForm
              mode="create"
              defaultValues={defaults}
              onSubmit={submit}
              submitting={create.isPending}
              cancelHref="/admin/issuers"
            />
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}
