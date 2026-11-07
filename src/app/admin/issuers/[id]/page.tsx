"use client";

import { Ban, Building2, Pencil, Plus } from "lucide-react";
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
import { TookenLoader } from "@/components/app/tooken-loader";
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
  const [editing, setEditing] = useState<IssuerFormValues | null>(null);

  if (issuer.isLoading && !issuer.data) return <PageSkeleton />;
  if (!issuer.data) {
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
  const knownEditableStatus = ["draft", "active", "suspended"].includes(
    i.status,
  );
  const countKnown =
    typeof i.real_estate_count === "number" &&
    Number.isSafeInteger(i.real_estate_count) &&
    i.real_estate_count >= 0;
  const canDissolve =
    knownEditableStatus && countKnown && i.real_estate_count === 0;

  const save = async (values: IssuerFormValues) => {
    if (!editing) return;
    const patch = buildIssuerPatch(editing, values);
    if (Object.keys(patch).length === 0) {
      toast.info("No changes to save");
      return;
    }
    try {
      await update.mutateAsync(patch);
      toast.success("Issuer updated");
      setEditing(null);
    } catch {
      // Rendered from update.error.
    }
  };

  const runDissolve = () => {
    if (!canDissolve || issuer.isError) {
      setConfirmDissolve(false);
      return;
    }
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
        issuer.refetch();
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
          knownEditableStatus ? (
            <Button
              asChild
              className="bg-brand text-brand-foreground hover:bg-brand-light"
            >
              <Link href={`/admin/assets/new?issuerId=${i.id}`}>
                <Plus /> New asset
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {issuer.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Latest issuer details are unavailable</AlertTitle>
              <AlertDescription>
                The information shown may be out of date.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => issuer.refetch()}
                >
                  Retry
                </button>
                .
              </AlertDescription>
            </Alert>
          ) : null}
          <Panel>
            <PanelHeader
              title="Legal identity"
              description={
                dissolved
                  ? "Dissolution is final. This issuer is read-only and cannot carry new assets."
                  : !knownEditableStatus
                    ? "The current status is unavailable for editing or creating assets."
                    : "Review the registered details before making changes."
              }
              actions={
                knownEditableStatus && !editing ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      update.reset();
                      setEditing(issuerToFormValues(i));
                    }}
                  >
                    <Pencil /> Edit legal details
                  </Button>
                ) : null
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
              {!editing || !knownEditableStatus ? (
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
                  mode="edit"
                  defaultValues={editing}
                  onSubmit={save}
                  submitting={update.isPending}
                  onCancel={() => {
                    setEditing(null);
                    update.reset();
                  }}
                />
              )}
            </PanelBody>
          </Panel>
          <IssuerAssets issuerId={i.id} />
        </div>

        <div className="space-y-6">
          {knownEditableStatus ? <StatusPanel issuer={i} /> : null}
          <Panel>
            <PanelHeader title="Record" />
            <PanelBody className="py-2">
              <KeyValueList
                items={[
                  { label: "Issuer ID", value: `#${i.id}` },
                  {
                    label: "Assets carried",
                    value: !countKnown
                      ? "Unavailable"
                      : formatNumber(i.real_estate_count),
                  },
                  { label: "Created", value: formatDateTime(i.created_at) },
                  { label: "Last update", value: formatDateTime(i.updated_at) },
                ]}
              />
            </PanelBody>
          </Panel>
          {!dissolved ? (
            <Panel>
              <PanelHeader
                title="Exceptional actions"
                description="Dissolution is final and cannot be reversed here."
              />
              <PanelBody className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {!countKnown
                    ? "The attached asset count is unavailable. Refresh before dissolving."
                    : (i.real_estate_count ?? 0) > 0
                      ? `This issuer carries ${i.real_estate_count} asset${i.real_estate_count === 1 ? "" : "s"}. Reassign or delete them before dissolution.`
                      : !knownEditableStatus
                        ? "Dissolution is unavailable while the issuer status is unknown."
                        : "No attached assets are reported. The server will check again before dissolution."}
                </p>
                {dissolve.isError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Dissolution was refused</AlertTitle>
                    <AlertDescription>
                      {errorMessage(dissolve.error)} Refresh the issuer and
                      resolve the conflict before retrying.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={
                    !canDissolve || dissolve.isPending || issuer.isError
                  }
                  onClick={() => {
                    dissolve.reset();
                    setConfirmDissolve(true);
                  }}
                >
                  <Ban /> Dissolve issuer
                </Button>
                {issuer.isError ? (
                  <p className="text-xs text-muted-foreground">
                    Refresh the issuer before dissolving it.
                  </p>
                ) : null}
              </PanelBody>
            </Panel>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDissolve && canDissolve && !issuer.isError}
        onOpenChange={setConfirmDissolve}
        title={`Dissolve ${i.name}?`}
        description={
          <div className="space-y-2">
            <p>
              Dissolution is final: the issuer is kept for audit purposes but
              can no longer be edited nor carry assets.
            </p>
            <p>
              The server checks for attached assets again before dissolving.
            </p>
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
          {update.isPending ? <TookenLoader size={16} /> : null}
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
      ) : (
        <>
          {details.isError ? (
            <Alert variant="destructive" className="m-4">
              <AlertTitle>Some offering details are unavailable</AlertTitle>
              <AlertDescription>
                The list may be incomplete.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => details.refetchFailed()}
                >
                  Retry
                </button>
                .
              </AlertDescription>
            </Alert>
          ) : null}
          {owned.length === 0 ? (
            !details.isError ? (
              <EmptyState
                icon={Building2}
                title="No offering yet"
                description="Assets attached to this issuer will be listed here."
              />
            ) : null
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
        </>
      )}
    </Panel>
  );
}
