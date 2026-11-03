"use client";

import { Ban, Building2, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AssetCell } from "@/app/admin/assets/_components/asset-cell";
import { useAssetDetails } from "@/app/admin/assets/_components/use-asset-details";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
  TableSkeleton,
} from "@/components/app/states";
import {
  IssuerStatusBadge,
  RealEstateStatusBadge,
} from "@/components/app/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { errorMessage } from "@/lib/api/client";
import {
  useDeleteIssuer,
  useIssuer,
  useRealEstates,
  useUpdateIssuer,
} from "@/lib/api/hooks";
import type { Issuer } from "@/lib/api/types";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { missingFieldLabel, missingFieldsOf } from "@/lib/missing-fields";
import { countryName } from "@/lib/reference";
import { ISSUER_STATUS } from "@/lib/status";
import {
  buildIssuerPatch,
  IssuerForm,
  type IssuerFormValues,
  issuerToFormValues,
} from "../_components/issuer-form";

export default function IssuerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const issuer = useIssuer(Number.isFinite(id) ? id : undefined);
  const update = useUpdateIssuer(id);
  const dissolve = useDeleteIssuer();
  const [confirmDissolve, setConfirmDissolve] = useState(false);

  if (issuer.isLoading) return <PageSkeleton />;
  if (issuer.isError || !issuer.data) {
    return (
      <>
        <PageHeader
          title="Issuer"
          breadcrumbs={[
            { label: "Back office", href: "/admin" },
            { label: "Issuers", href: "/admin/issuers" },
          ]}
        />
        <Panel>
          <ErrorState
            error={issuer.error ?? new Error("Issuer not found.")}
            onRetry={() => issuer.refetch()}
          />
        </Panel>
      </>
    );
  }

  const i = issuer.data;
  const dissolved = i.status === "dissolved";
  const initial = issuerToFormValues(i);

  const save = async (values: IssuerFormValues) => {
    const patch = buildIssuerPatch(initial, values);
    if (Object.keys(patch).length === 0) {
      toast.info("No changes to save");
      return;
    }
    try {
      await update.mutateAsync(patch);
      toast.success("Issuer updated");
    } catch {
      // Rendered from update.error.
    }
  };

  const runDissolve = () => {
    dissolve.mutate(i.id, {
      onSuccess: () => {
        setConfirmDissolve(false);
        toast.success("Issuer dissolved");
        issuer.refetch();
      },
      onError: (e) => {
        setConfirmDissolve(false);
        toast.error("The issuer could not be dissolved", {
          description: errorMessage(e),
        });
      },
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Issuer"
        title={i.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <IssuerStatusBadge status={i.status} />
            <span>
              {i.legal_form} · {countryName(i.country_code)}
            </span>
          </span>
        }
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Issuers", href: "/admin/issuers" },
          { label: i.name },
        ]}
        actions={
          <>
            {!dissolved ? (
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirmDissolve(true)}
              >
                <Ban /> Dissolve
              </Button>
            ) : null}
            <Button
              asChild
              className="bg-brand text-brand-foreground hover:bg-brand-light"
            >
              <Link href="/admin/assets/new">
                <Plus /> New asset
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Panel>
            <PanelHeader
              title="Legal identity"
              description={
                dissolved
                  ? "A dissolved issuer is final and can no longer be edited."
                  : "Only modified fields are sent."
              }
            />
            <PanelBody className="space-y-4">
              {update.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>The changes were refused</AlertTitle>
                  <AlertDescription>
                    {refusalMessage(update.error)}
                  </AlertDescription>
                </Alert>
              ) : null}
              {dissolved ? (
                <KeyValueList
                  columns={2}
                  items={[
                    { label: "Legal name", value: i.name },
                    { label: "Legal form", value: i.legal_form },
                    {
                      label: "Jurisdiction",
                      value: countryName(i.country_code),
                    },
                    {
                      label: "Registration no.",
                      value: i.registration_number || "—",
                    },
                    { label: "LEI", value: i.lei_code || "—", mono: true },
                  ]}
                />
              ) : (
                <IssuerForm
                  key={i.updated_at ?? i.id}
                  mode="edit"
                  defaultValues={initial}
                  onSubmit={save}
                  submitting={update.isPending}
                />
              )}
            </PanelBody>
          </Panel>
          <IssuerAssets issuerId={i.id} />
        </div>

        <div className="space-y-6">
          {!dissolved ? <StatusPanel issuer={i} /> : null}
          <Panel>
            <PanelHeader title="Record" />
            <PanelBody className="py-2">
              <KeyValueList
                items={[
                  { label: "Issuer ID", value: `#${i.id}` },
                  {
                    label: "Assets carried",
                    value: formatNumber(i.real_estate_count ?? 0),
                  },
                  { label: "Created", value: formatDateTime(i.created_at) },
                  { label: "Last update", value: formatDateTime(i.updated_at) },
                ]}
              />
            </PanelBody>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDissolve}
        onOpenChange={setConfirmDissolve}
        title={`Dissolve ${i.name}?`}
        description={
          <div className="space-y-2">
            <p>
              Dissolution is final: the issuer is kept for audit purposes but
              can no longer be edited nor carry assets.
            </p>
            {(i.real_estate_count ?? 0) > 0 ? (
              <p className="font-medium text-red-700">
                This issuer still carries {i.real_estate_count} asset
                {i.real_estate_count === 1 ? "" : "s"}. Reassign or delete them
                first; the platform will refuse otherwise.
              </p>
            ) : null}
          </div>
        }
        confirmLabel="Dissolve issuer"
        destructive
        pending={dissolve.isPending}
        onConfirm={runDissolve}
      />
    </>
  );
}

/** Names the fields to complete when the refusal is a completeness conflict. */
function refusalMessage(error: unknown): string {
  const missing = missingFieldsOf(error);
  return missing.length
    ? `Complete first: ${missing.map(missingFieldLabel).join(", ")}.`
    : errorMessage(error);
}

const SETTABLE_STATUSES = ["draft", "active", "suspended"] as const;

function StatusPanel({ issuer }: { issuer: Issuer }) {
  const update = useUpdateIssuer(issuer.id);
  const [next, setNext] = useState<string>(String(issuer.status_id));
  const changed = next !== String(issuer.status_id);

  const apply = () => {
    update.mutate(
      { status_id: Number(next) },
      {
        onSuccess: (r) =>
          toast.success("Status updated", {
            description: `${r.name} is now ${ISSUER_STATUS[r.status]?.label.toLowerCase() ?? r.status}.`,
          }),
      },
    );
  };

  return (
    <Panel>
      <PanelHeader
        title="Status"
        description="Only active issuers can have assets published."
      />
      <PanelBody className="space-y-3">
        <label htmlFor="issuer-status" className="sr-only">
          Issuer status
        </label>
        <Select
          value={next}
          onValueChange={(v) => {
            setNext(v);
            update.reset();
          }}
        >
          <SelectTrigger id="issuer-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETTABLE_STATUSES.map((s) => (
              <SelectItem key={s} value={String(ISSUER_STATUS[s].id)}>
                {ISSUER_STATUS[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {update.isError ? (
          <p className="text-xs text-red-600" role="alert">
            {refusalMessage(update.error)}
          </p>
        ) : null}
        <Button
          variant="outline"
          className="w-full"
          disabled={!changed || update.isPending}
          onClick={apply}
        >
          {update.isPending ? <Loader2 className="animate-spin" /> : null}
          Update status
        </Button>
      </PanelBody>
    </Panel>
  );
}

function IssuerAssets({ issuerId }: { issuerId: number }) {
  const list = useRealEstates();
  const rows = list.data ?? [];
  const details = useAssetDetails(rows.map((r) => r.id));
  const owned = rows.filter(
    (r) => details.byId.get(r.id)?.issuer?.id === issuerId,
  );
  const loading = list.isLoading || details.isLoading;

  return (
    <Panel>
      <PanelHeader
        title="Offerings"
        description="Assets issued through this vehicle."
      />
      {loading ? (
        <TableSkeleton rows={2} cols={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : owned.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No offering yet"
          description="Assets attached to this issuer will be listed here."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Asset</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valuation</TableHead>
                <TableHead className="pr-5 text-right">Yield</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owned.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-5">
                    <AssetCell asset={r} linked />
                  </TableCell>
                  <TableCell>
                    <RealEstateStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {formatMoney(
                      r.configuration?.total_valuation,
                      r.configuration?.currency_code,
                      { decimals: 0 },
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right tabular">
                    {formatPercent(r.configuration?.yield)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
