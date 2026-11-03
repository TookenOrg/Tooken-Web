"use client";

import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Link2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormField } from "@/components/app/form-field";
import { HashValue } from "@/components/app/hash-value";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/app/states";
import {
  KycFileStatusBadge,
  KycStatusBadge,
} from "@/components/app/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, errorMessage } from "@/lib/api/client";
import {
  useApproveKyc,
  useKyc,
  useRejectKyc,
  useRevokeKyc,
  useSyncKycOnChain,
} from "@/lib/api/hooks";
import type { KycOnChainSyncResponse, KycVerification } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  defaultKycExpiry,
  expiryDateToIso,
  isKycExpired,
  needsOnChainSync,
} from "@/lib/kyc-review";
import { countryName, countryNumeric } from "@/lib/reference";
import type { TimelineStep } from "@/lib/status";
import { StepTimeline } from "../../_components/step-timeline";

export default function KycFilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;
  const kyc = useKyc(valid ? id : undefined);

  const crumbs = [
    { label: "Back office", href: "/admin" },
    { label: "KYC reviews", href: "/admin/compliance" },
    { label: `File #${params.id}` },
  ];

  if (!valid || kyc.isError) {
    const notFound =
      !valid || (kyc.error instanceof ApiError && kyc.error.status === 404);
    return (
      <>
        <PageHeader title={`KYC file #${params.id}`} breadcrumbs={crumbs} />
        <Panel>
          {notFound ? (
            <EmptyState
              title="KYC file not found"
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/compliance">
                    <ArrowLeft /> Back to reviews
                  </Link>
                </Button>
              }
            />
          ) : (
            <ErrorState error={kyc.error} onRetry={() => kyc.refetch()} />
          )}
        </Panel>
      </>
    );
  }
  if (kyc.isPending) return <PageSkeleton />;
  return <KycFile file={kyc.data} crumbs={crumbs} />;
}

type Dialog = "approve" | "reject" | "revoke" | "sync" | null;

function KycFile({
  file,
  crumbs,
}: {
  file: KycVerification;
  crumbs: { label: string; href?: string }[];
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [expiry, setExpiry] = useState(defaultKycExpiry);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<KycOnChainSyncResponse | null>(
    null,
  );

  const approve = useApproveKyc();
  const reject = useRejectKyc();
  const revoke = useRevokeKyc();
  const sync = useSyncKycOnChain();

  const submitted = file.status === "submitted";
  const approved = file.status === "approved";
  const syncNeeded = needsOnChainSync(file);
  const expired = approved && isKycExpired(file);
  const onChain = file.kyc_status === "verified";

  const open = (d: Dialog) => {
    setFormError(null);
    setReason("");
    if (d === "approve") setExpiry(defaultKycExpiry());
    setDialog(d);
  };
  const close = () => setDialog(null);
  const fail = (title: string) => (err: unknown) =>
    toast.error(title, { description: errorMessage(err) });

  const runApprove = () => {
    const iso = expiryDateToIso(expiry);
    if (!iso || new Date(iso).getTime() <= Date.now()) {
      setFormError("Choose an expiry date in the future.");
      return;
    }
    approve.mutate(
      { id: file.id, expiresAt: iso },
      {
        onSuccess: () => {
          toast.success("KYC approved", {
            description: "Register the investor on-chain to enable investing.",
          });
          close();
        },
        onError: fail("Approval failed"),
      },
    );
  };

  const runWithReason = (kind: "reject" | "revoke") => {
    const text = reason.trim();
    if (text.length < 3) {
      setFormError(
        "A reason is required; it is kept in the compliance record.",
      );
      return;
    }
    const m = kind === "reject" ? reject : revoke;
    m.mutate(
      { id: file.id, reason: text },
      {
        onSuccess: () => {
          toast.success(kind === "reject" ? "KYC rejected" : "KYC revoked");
          close();
        },
        onError: fail(
          kind === "reject" ? "Rejection failed" : "Revocation failed",
        ),
      },
    );
  };

  const runSync = () => {
    sync.mutate(file.id, {
      onSuccess: (res) => {
        setSyncResult(res as KycOnChainSyncResponse);
        toast.success("Investor registered on-chain");
        close();
      },
      onError: fail("On-chain registration failed"),
    });
  };

  const steps: (TimelineStep & { hint?: string })[] = [
    {
      key: "submitted",
      label: "Submitted",
      state: "done",
      hint: formatDateTime(file.submitted_at ?? file.created_at),
    },
    {
      key: "decision",
      label:
        file.status === "rejected"
          ? "Rejected"
          : submitted
            ? "Compliance decision"
            : "Approved",
      state: submitted
        ? "current"
        : file.status === "rejected"
          ? "failed"
          : "done",
      hint: file.decided_at ? formatDateTime(file.decided_at) : undefined,
    },
    {
      key: "onchain",
      label: "On-chain registration",
      state: onChain
        ? "done"
        : approved
          ? "current"
          : file.status === "revoked" && file.kyc_verified_at
            ? "done"
            : "upcoming",
      hint: file.kyc_verified_at
        ? formatDateTime(file.kyc_verified_at)
        : undefined,
    },
    ...(file.status === "revoked"
      ? [
          {
            key: "revoked",
            label: "Revoked",
            state: "failed" as const,
            hint: formatDateTime(file.revoked_at),
          },
        ]
      : []),
  ];

  const pending =
    approve.isPending || reject.isPending || revoke.isPending || sync.isPending;

  return (
    <>
      <PageHeader
        eyebrow={`KYC file #${file.id}`}
        title={file.declared_full_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <KycFileStatusBadge status={file.status} />
            <span>{file.email}</span>
          </span>
        }
        breadcrumbs={crumbs}
        actions={
          <>
            {submitted ? (
              <>
                <Button variant="outline" onClick={() => open("reject")}>
                  <XCircle /> Reject
                </Button>
                <Button
                  className="bg-brand text-brand-foreground hover:bg-brand-light"
                  onClick={() => open("approve")}
                >
                  <CheckCircle2 /> Approve
                </Button>
              </>
            ) : null}
            {approved ? (
              <>
                <Button variant="outline" onClick={() => open("revoke")}>
                  <Ban /> Revoke
                </Button>
                {!onChain ? (
                  <Button
                    className="bg-brand text-brand-foreground hover:bg-brand-light"
                    onClick={() => open("sync")}
                    disabled={expired}
                  >
                    <Link2 /> Sync on-chain
                  </Button>
                ) : null}
              </>
            ) : null}
          </>
        }
      />

      <div className="space-y-6">
        {approved && syncNeeded && !expired ? (
          <Alert className="border-amber-200 bg-amber-50">
            <ShieldAlert />
            <AlertTitle>Action needed: on-chain registration</AlertTitle>
            <AlertDescription>
              The file is approved but the investor is not yet registered in the
              identity registry. Until then they cannot subscribe to offerings.
            </AlertDescription>
          </Alert>
        ) : null}
        {expired ? (
          <Alert variant="destructive">
            <ShieldAlert />
            <AlertTitle>Approval expired</AlertTitle>
            <AlertDescription>
              This approval expired on {formatDate(file.expires_at)}. The
              investor must file a new verification.
            </AlertDescription>
          </Alert>
        ) : null}

        <Panel>
          <PanelHeader title="Verification progress" />
          <PanelBody>
            <StepTimeline steps={steps} live={sync.isPending} />
          </PanelBody>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              title="Declared identity"
              description="As submitted by the investor."
            />
            <PanelBody className="py-2">
              <KeyValueList
                items={[
                  { label: "Full name", value: file.declared_full_name },
                  {
                    label: "Country of residence",
                    value: countryName(file.declared_country_code),
                    hint: `${file.declared_country_code} · ISO numeric ${countryNumeric(file.declared_country_code) ?? "—"}`,
                  },
                  {
                    label: "Submitted",
                    value: formatDateTime(file.submitted_at ?? file.created_at),
                  },
                ]}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="User account" />
            <PanelBody className="py-2">
              <KeyValueList
                items={[
                  { label: "User ID", value: `#${file.user_id}` },
                  {
                    label: "E-mail",
                    value: (
                      <a
                        href={`mailto:${file.email}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {file.email}
                      </a>
                    ),
                  },
                  {
                    label: "Account KYC status",
                    value: file.kyc_status ? (
                      <KycStatusBadge status={file.kyc_status} />
                    ) : (
                      "—"
                    ),
                  },
                  {
                    label: "Verified on-chain",
                    value: formatDateTime(file.kyc_verified_at),
                  },
                ]}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Decision" />
            <PanelBody className="py-2">
              <KeyValueList
                items={[
                  {
                    label: "Decided",
                    value: formatDateTime(file.decided_at),
                  },
                  {
                    label: "Decided by",
                    value: file.decided_by ? `User #${file.decided_by}` : "—",
                  },
                  {
                    label: "Valid until",
                    value: formatDate(file.expires_at),
                  },
                  ...(file.rejection_reason
                    ? [
                        {
                          label: "Rejection reason",
                          value: (
                            <span className="whitespace-pre-wrap font-normal">
                              {file.rejection_reason}
                            </span>
                          ),
                        },
                      ]
                    : []),
                  ...(file.revoked_at
                    ? [
                        {
                          label: "Revoked",
                          value: formatDateTime(file.revoked_at),
                          hint: file.revoked_by
                            ? `by user #${file.revoked_by}`
                            : undefined,
                        },
                        {
                          label: "Revocation reason",
                          value: (
                            <span className="whitespace-pre-wrap font-normal">
                              {file.revocation_reason ?? "—"}
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </PanelBody>
          </Panel>

          {syncResult ? (
            <Panel>
              <PanelHeader
                title="On-chain registration"
                description="Returned by the identity registry."
              />
              <PanelBody className="py-2">
                <KeyValueList
                  items={[
                    {
                      label: "Wallet",
                      value: <HashValue value={syncResult.wallet_address} />,
                    },
                    {
                      label: "ONCHAINID identity",
                      value: <HashValue value={syncResult.identity_address} />,
                    },
                    {
                      label: "Country",
                      value: `${countryName(syncResult.country_code)} (${syncResult.country_numeric})`,
                    },
                    {
                      label: "Status",
                      value: <KycStatusBadge status={syncResult.kyc_status} />,
                    },
                    {
                      label: "Identity deployment",
                      value: (
                        <HashValue value={syncResult.transactions?.identity} />
                      ),
                    },
                    {
                      label: "KYC claim",
                      value: (
                        <HashValue value={syncResult.transactions?.claim} />
                      ),
                    },
                    {
                      label: "Registry entry",
                      value: (
                        <HashValue
                          value={syncResult.transactions?.register_identity}
                        />
                      ),
                    },
                  ]}
                />
              </PanelBody>
            </Panel>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(o) => !o && close()}
        title="Approve identity verification"
        description={`Approve ${file.declared_full_name}'s file. The investor will then need to be registered on-chain.`}
        confirmLabel="Approve"
        pending={pending}
        onConfirm={runApprove}
      >
        <FormField
          label="Approval valid until"
          htmlFor="kyc-expiry"
          required
          error={formError ?? undefined}
          hint="Defaults to one year. The investor must renew after this date."
        >
          <Input
            id="kyc-expiry"
            type="date"
            value={expiry}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setExpiry(e.target.value);
              setFormError(null);
            }}
          />
        </FormField>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "reject" || dialog === "revoke"}
        onOpenChange={(o) => !o && close()}
        title={
          dialog === "revoke"
            ? "Revoke identity verification"
            : "Reject identity verification"
        }
        description={
          dialog === "revoke"
            ? "The investor will no longer be able to subscribe. They may file a new verification afterwards."
            : "The investor will be informed and may submit a new file."
        }
        confirmLabel={dialog === "revoke" ? "Revoke" : "Reject"}
        destructive
        pending={pending}
        onConfirm={() =>
          runWithReason(dialog === "revoke" ? "revoke" : "reject")
        }
      >
        <FormField
          label="Reason"
          htmlFor="kyc-reason"
          required
          error={formError ?? undefined}
          hint="Kept in the compliance record."
        >
          <Textarea
            id="kyc-reason"
            value={reason}
            rows={4}
            maxLength={500}
            onChange={(e) => {
              setReason(e.target.value);
              setFormError(null);
            }}
            placeholder={
              dialog === "revoke"
                ? "e.g. Sanctions screening hit on periodic review"
                : "e.g. Declared name does not match the identity document"
            }
          />
        </FormField>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "sync"}
        onOpenChange={(o) => !o && close()}
        title="Register investor on-chain"
        description={
          <p>
            Deploys the investor&apos;s ONCHAINID identity, issues the KYC claim
            and registers it in the T-REX identity registry for{" "}
            <strong>{countryName(file.declared_country_code)}</strong>. These
            are blockchain transactions and take a few seconds.
          </p>
        }
        confirmLabel="Register on-chain"
        pending={pending}
        onConfirm={runSync}
      />
    </>
  );
}
