"use client";

import {
  AlertTriangle,
  ExternalLink,
  Landmark,
  Loader2,
  Pencil,
  Rocket,
  Trash2,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { HashValue } from "@/components/app/hash-value";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/app/states";
import {
  IssuerStatusBadge,
  RealEstateStatusBadge,
} from "@/components/app/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, errorMessage } from "@/lib/api/client";
import {
  useDeleteRealEstate,
  useIssuer,
  useOpenFundraising,
  usePublishRealEstate,
  useRealEstate,
  useTokenInfos,
} from "@/lib/api/hooks";
import type { RealEstate } from "@/lib/api/types";
import {
  formatDate,
  formatDateTime,
  formatFrequency,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { countryName, estateTypeLabel } from "@/lib/reference";
import { AssetLifecycle } from "../_components/asset-lifecycle";
import { AssetOrders } from "../_components/asset-orders";
import {
  missingFieldLabel,
  parseMissingFields,
} from "../_components/asset-payload";

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const asset = useRealEstate(Number.isFinite(id) ? id : undefined);
  const publish = usePublishRealEstate();
  const open = useOpenFundraising();
  const remove = useDeleteRealEstate();
  const [confirm, setConfirm] = useState<"publish" | "open" | "delete" | null>(
    null,
  );

  if (asset.isLoading) return <PageSkeleton />;
  if (asset.isError || !asset.data) {
    return (
      <>
        <PageHeader
          title="Asset"
          breadcrumbs={[
            { label: "Back office", href: "/admin" },
            { label: "Assets", href: "/admin/assets" },
          ]}
        />
        <Panel>
          <ErrorState
            error={asset.error ?? new Error("Asset not found.")}
            onRetry={() => asset.refetch()}
          />
        </Panel>
      </>
    );
  }

  const re = asset.data;
  const status = re.status ?? "draft";
  const isDraft = status === "draft" || status === "in_review";

  const runPublish = () => {
    setConfirm(null);
    open.reset();
    publish.mutate(re.id, {
      onSuccess: (r) =>
        toast.success("Asset published", {
          description: r.token?.symbol
            ? `Token ${r.token.symbol} deployed at ${r.token.address?.slice(0, 10)}…`
            : "The ERC-3643 token has been deployed.",
        }),
    });
  };

  const runOpen = () => {
    open.mutate(re.id, {
      onSuccess: () => {
        setConfirm(null);
        toast.success("Fundraising opened", {
          description: "Verified investors can now subscribe.",
        });
      },
      onError: () => setConfirm(null),
    });
  };

  const runDelete = () => {
    remove.mutate(re.id, {
      onSuccess: () => {
        setConfirm(null);
        toast.success("Asset deleted");
        router.push("/admin/assets");
      },
      onError: (e) => {
        setConfirm(null);
        toast.error("The asset could not be deleted", {
          description: errorMessage(e),
        });
      },
    });
  };

  return (
    <>
      <PageHeader
        eyebrow={estateTypeLabel(re.estate_type, re.estate_type_id)}
        title={re.title || "Untitled asset"}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <RealEstateStatusBadge status={status} />
            <span>
              {[re.location?.city, countryName(re.location?.country_code)]
                .filter((s) => s && s !== "—")
                .join(", ")}
            </span>
            {re.issuer?.name ? <span>· {re.issuer.name}</span> : null}
          </span>
        }
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Assets", href: "/admin/assets" },
          { label: re.title || `#${re.id}` },
        ]}
        actions={
          <>
            {isDraft ? (
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirm("delete")}
              >
                <Trash2 /> Delete
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href={`/real-estate/${re.id}`}>
                  <ExternalLink /> Marketplace view
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/admin/assets/${re.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            {isDraft ? (
              <Button
                className="bg-brand text-brand-foreground hover:bg-brand-light"
                disabled={publish.isPending}
                onClick={() => setConfirm("publish")}
              >
                {publish.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Rocket />
                )}
                Publish & tokenize
              </Button>
            ) : null}
            {status === "published" ? (
              <Button
                className="bg-brand text-brand-foreground hover:bg-brand-light"
                disabled={open.isPending}
                onClick={() => setConfirm("open")}
              >
                {open.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Unlock />
                )}
                Open fundraising
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-6">
        <Panel>
          <PanelBody>
            <AssetLifecycle
              status={status}
              pendingStep={
                publish.isPending ? 1 : open.isPending ? 2 : undefined
              }
            />
          </PanelBody>
        </Panel>

        {publish.isPending ? <PublishProgress /> : null}
        {publish.isError ? (
          <PublishError
            error={publish.error}
            assetId={re.id}
            onDismiss={() => publish.reset()}
          />
        ) : null}
        {open.isError ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Fundraising could not be opened</AlertTitle>
            <AlertDescription>{errorMessage(open.error)}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="token">Token</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="issuer">Issuer</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="overview">
            <OverviewTab asset={re} />
          </TabsContent>
          <TabsContent value="token">
            <TokenTab
              asset={re}
              onPublish={isDraft ? () => setConfirm("publish") : undefined}
            />
          </TabsContent>
          <TabsContent value="orders">
            <AssetOrders asset={re} />
          </TabsContent>
          <TabsContent value="issuer">
            <IssuerTab asset={re} />
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={confirm === "publish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Publish and tokenize this asset?"
        description={
          <div className="space-y-2">
            <p>
              An ERC-3643 (T-REX) token suite will be deployed on-chain for{" "}
              <strong className="text-ink">{re.title}</strong> with{" "}
              <strong className="text-ink tabular">
                {formatNumber(re.configuration?.total_shares)}
              </strong>{" "}
              shares.
            </p>
            <p>
              Once tokenized, the share count can no longer change and the asset
              cannot be deleted.
            </p>
          </div>
        }
        confirmLabel="Publish & deploy token"
        onConfirm={runPublish}
      />
      <ConfirmDialog
        open={confirm === "open"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Open the subscription period?"
        description="The asset becomes available for subscription to KYC-verified investors in the marketplace."
        confirmLabel="Open fundraising"
        pending={open.isPending}
        onConfirm={runOpen}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete this draft?"
        description="The asset is cancelled and kept for audit purposes. It will no longer appear in the back office."
        confirmLabel="Delete asset"
        destructive
        pending={remove.isPending}
        onConfirm={runDelete}
      />
    </>
  );
}

const PUBLISH_STEPS = [
  "Checking asset completeness",
  "Deploying ERC-3643 token suite",
  "Binding the token to the asset",
];

function PublishProgress() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - start), 200);
    return () => clearInterval(t);
  }, []);
  const step = elapsed < 800 ? 0 : elapsed < 4500 ? 1 : 2;
  const pct = Math.min(92, (elapsed / 6000) * 100);
  return (
    <Panel className="border-amber-200">
      <output aria-live="polite" className="block">
        <PanelBody className="space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-ink">
                Deploying ERC-3643 token…
              </p>
              <p className="text-xs text-muted-foreground">
                {PUBLISH_STEPS[step]}. This usually takes a few seconds; keep
                this page open.
              </p>
            </div>
          </div>
          <Progress
            value={pct}
            className="h-1.5 bg-amber-100 [&>div]:bg-brand"
            aria-label="Deployment progress"
          />
        </PanelBody>
      </output>
    </Panel>
  );
}

function PublishError({
  error,
  assetId,
  onDismiss,
}: {
  error: unknown;
  assetId: number;
  onDismiss: () => void;
}) {
  const missing =
    error instanceof ApiError && error.status === 409
      ? parseMissingFields(error.message)
      : [];
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>
        {missing.length
          ? "The asset is not complete enough to be published"
          : "Publication failed"}
      </AlertTitle>
      <AlertDescription>
        {missing.length ? (
          <div className="space-y-3">
            <p>Complete the following before publishing:</p>
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {missing.map((m) => (
                <li key={m} className="flex items-center gap-2 text-ink">
                  <span className="size-1.5 rounded-full bg-red-500" />
                  {missingFieldLabel(m)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>{errorMessage(error)}</p>
        )}
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/assets/${assetId}/edit`}>
              <Pencil /> Complete the asset
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold text-ink tabular">
        {value}
      </p>
    </div>
  );
}

function OverviewTab({ asset: re }: { asset: RealEstate }) {
  const c = re.configuration;
  const s = re.specification;
  const a = re.address;
  const media = [...(re.media ?? [])].sort(
    (x, y) => (x.position ?? 0) - (y.position ?? 0),
  );
  return (
    <div className="space-y-6">
      <Panel>
        <div className="grid grid-cols-2 divide-border sm:grid-cols-3 sm:divide-x xl:grid-cols-6 [&>*]:border-b [&>*]:border-border xl:[&>*]:border-b-0">
          <Figure
            label="Valuation"
            value={formatMoney(c?.total_valuation, c?.currency_code, {
              decimals: 0,
            })}
          />
          <Figure
            label="Price / share"
            value={formatMoney(c?.price_per_share, c?.currency_code)}
          />
          <Figure label="Total shares" value={formatNumber(c?.total_shares)} />
          <Figure label="Target yield" value={formatPercent(c?.yield)} />
          <Figure
            label="Distributions"
            value={formatFrequency(
              c?.payment_frequency,
              c?.payment_frequency_type,
            )}
          />
          <Figure
            label="Max / investor"
            value={
              c?.max_shares_per_investor
                ? `${formatNumber(c.max_shares_per_investor)} sh.`
                : "—"
            }
          />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Description" />
            <PanelBody>
              {re.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">
                  {re.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description yet. It is required before publication.
                </p>
              )}
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader
              title="Media"
              description={`${media.length} image${media.length === 1 ? "" : "s"}`}
            />
            <PanelBody>
              {media.length ? (
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {media.map((m) => (
                    <li key={m.id ?? m.url} className="space-y-1.5">
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="relative block aspect-[4/3] overflow-hidden rounded-md bg-muted bg-cover bg-center ring-1 ring-border transition hover:opacity-90"
                        style={{ backgroundImage: `url("${m.url}")` }}
                        aria-label={m.alt_text || "Open image"}
                      >
                        {m.is_cover ? (
                          <span className="absolute left-2 top-2 rounded bg-ink/85 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                            Cover
                          </span>
                        ) : null}
                      </a>
                      {m.alt_text ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {m.alt_text}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No image yet. At least one is required before publication.
                </p>
              )}
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Specification" />
            <PanelBody className="py-2">
              <KeyValueList
                items={[
                  {
                    label: "Surface area",
                    value: s?.surface_area
                      ? `${formatNumber(s.surface_area, 2)} m²`
                      : "—",
                  },
                  {
                    label: "Lot size",
                    value: s?.lot_size
                      ? `${formatNumber(s.lot_size, 2)} m²`
                      : "—",
                  },
                  ...(s?.terrace_size
                    ? [
                        {
                          label: "Terrace",
                          value: `${formatNumber(s.terrace_size, 2)} m²`,
                        },
                      ]
                    : []),
                  ...(s?.pool_size
                    ? [
                        {
                          label: "Pool",
                          value: `${formatNumber(s.pool_size, 2)} m²`,
                        },
                      ]
                    : []),
                  {
                    label: "Bedrooms / bathrooms",
                    value: `${s?.bedroom_number ?? "—"} / ${s?.bathroom_number ?? "—"}`,
                  },
                  { label: "Year built", value: s?.build_year ?? "—" },
                  {
                    label: "Energy / GHG class",
                    value: `${s?.energy_class ?? "—"} / ${s?.ges_class ?? "—"}`,
                  },
                ]}
              />
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader title="Address" description="Restricted to staff." />
            <PanelBody className="py-2">
              {a ? (
                <KeyValueList
                  items={[
                    {
                      label: "Street",
                      value: a.street,
                      hint: a.street_complement,
                    },
                    {
                      label: "City",
                      value: `${a.postal_code} ${a.city}`,
                      hint: a.region,
                    },
                    { label: "Country", value: countryName(a.country_code) },
                    {
                      label: "Coordinates",
                      value:
                        a.latitude && a.longitude
                          ? `${a.latitude}, ${a.longitude}`
                          : "—",
                      mono: !!a.latitude,
                    },
                  ]}
                />
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  Address not available.
                </p>
              )}
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader title="Record" />
            <PanelBody className="py-2">
              <KeyValueList
                items={[
                  { label: "Asset ID", value: `#${re.id}` },
                  { label: "Created", value: formatDateTime(re.created_at) },
                  {
                    label: "Published",
                    value: formatDateTime(re.published_at),
                  },
                  {
                    label: "Last update",
                    value: formatDateTime(re.updated_at),
                  },
                ]}
              />
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TokenTab({
  asset: re,
  onPublish,
}: {
  asset: RealEstate;
  onPublish?: () => void;
}) {
  const address = re.token?.address ?? re.contract_address;
  const infos = useTokenInfos(address);
  const onChain =
    infos.data && typeof infos.data === "object" ? infos.data : null;

  if (!address) {
    return (
      <Panel>
        <EmptyState
          icon={Rocket}
          title="Not tokenized yet"
          description="The ERC-3643 security token is deployed when the asset is published."
          action={
            onPublish ? (
              <Button
                className="bg-brand text-brand-foreground hover:bg-brand-light"
                onClick={onPublish}
              >
                <Rocket /> Publish & tokenize
              </Button>
            ) : null
          }
        />
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel>
        <PanelHeader
          title="Security token"
          description="ERC-3643 (T-REX) permissioned token bound to this asset."
        />
        <PanelBody className="py-2">
          <KeyValueList
            items={[
              {
                label: "Contract address",
                value: <HashValue value={address} size={8} />,
              },
              {
                label: "Symbol",
                value: re.token?.symbol ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {re.token.symbol}
                  </span>
                ) : (
                  "—"
                ),
              },
              { label: "Name", value: re.token?.token_name ?? "—" },
              { label: "Decimals", value: re.token?.nb_decimal ?? "—" },
              {
                label: "Supply cap",
                value: `${formatNumber(re.configuration?.total_shares)} shares`,
              },
              { label: "Standard", value: "ERC-3643 / T-REX" },
            ]}
          />
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader
          title="On-chain details"
          description="Read from the blockchain gateway."
        />
        <PanelBody className="py-2">
          {infos.isLoading ? (
            <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Querying the network…
            </p>
          ) : onChain ? (
            <KeyValueList
              items={[
                { label: "Token ID", value: onChain.id },
                {
                  label: "Compliance module",
                  value: <HashValue value={onChain.modularComplianceAddr} />,
                },
                { label: "Salt", value: onChain.salt ?? "—", mono: true },
                { label: "Deployed", value: formatDate(onChain.createdAt) },
              ]}
            />
          ) : (
            <div className="py-3 text-sm text-muted-foreground">
              <p className="font-medium text-ink">
                On-chain details unavailable
              </p>
              <p className="mt-1">
                {infos.isError
                  ? errorMessage(infos.error)
                  : "The gateway did not return token metadata for this contract. The binding above is authoritative."}
              </p>
            </div>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}

function IssuerTab({ asset: re }: { asset: RealEstate }) {
  const issuer = useIssuer(re.issuer?.id);
  if (!re.issuer?.id) {
    return (
      <Panel>
        <EmptyState
          icon={Landmark}
          title="No issuer attached"
          description="Attach the legal vehicle issuing the shares before publication."
        />
      </Panel>
    );
  }
  const i = issuer.data;
  return (
    <Panel>
      <PanelHeader
        title={re.issuer.name}
        description="Legal vehicle issuing the tokenized shares."
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/issuers/${re.issuer.id}`}>Open issuer</Link>
          </Button>
        }
      />
      <PanelBody className="py-2">
        <KeyValueList
          columns={2}
          items={[
            {
              label: "Status",
              value: (
                <IssuerStatusBadge status={i?.status ?? re.issuer.status} />
              ),
            },
            {
              label: "Legal form",
              value: i?.legal_form ?? re.issuer.legal_form ?? "—",
            },
            {
              label: "Jurisdiction",
              value: countryName(i?.country_code ?? re.issuer.country_code),
            },
            {
              label: "Registration no.",
              value: i?.registration_number ?? "—",
              mono: !!i?.registration_number,
            },
            { label: "LEI", value: i?.lei_code ?? "—", mono: !!i?.lei_code },
            {
              label: "Assets carried",
              value: i?.real_estate_count ?? "—",
            },
          ]}
        />
      </PanelBody>
    </Panel>
  );
}
