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
import { useEffect, useRef, useState } from "react";
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
import { useSession } from "@/lib/auth/session-context";
import { formatDate, formatDateTime } from "@/lib/format";
import { defaultKycExpiry, expiryDateToIso } from "@/lib/kyc-review";
import { countryName, countryNumeric } from "@/lib/reference";
import type { TimelineStep } from "@/lib/status";
import { StepTimeline } from "../../_components/step-timeline";

export default function KycFilePage() {
  const { isAdmin, userLoading } = useSession();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const valid = Number.isSafeInteger(id) && id > 0;
  const kyc = useKyc(valid && isAdmin ? id : undefined);

  const crumbs = [
    { label: "Back office", href: "/admin" },
    { label: "KYC reviews", href: "/admin/compliance" },
    { label: `File #${params.id}` },
  ];

  if (!isAdmin && userLoading) return <PageSkeleton />;
  if (!isAdmin) {
    return (
      <Panel>
        <EmptyState
          title="Administrator access required"
          description="KYC files are available to administrators only."
        />
      </Panel>
    );
  }
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
            <ErrorState error={kyc.error} onRetry={() => void kyc.refetch()} />
          )}
        </Panel>
      </>
    );
  }
  if (kyc.isPending || !kyc.data) return <PageSkeleton />;
  return (
    <KycFile
      key={kyc.data.id}
      file={kyc.data}
      crumbs={crumbs}
      refreshFile={() => kyc.refetch()}
    />
  );
}

type Dialog = "approve" | "reject" | "revoke" | "sync" | null;
type SyncNotice = { kind: "failed" | "unknown"; message: string };

function KycFile({
  file,
  crumbs,
  refreshFile,
}: {
  file: KycVerification;
  crumbs: { label: string; href?: string }[];
  refreshFile: () => Promise<{
    data: KycVerification | undefined;
    isError: boolean;
  }>;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [expiry, setExpiry] = useState(defaultKycExpiry);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [expectedDecision, setExpectedDecision] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<SyncNotice | null>(null);
  const [syncResult, setSyncResult] = useState<KycOnChainSyncResponse | null>(
    null,
  );
  const actionLock = useRef(false);

  const approve = useApproveKyc();
  const reject = useRejectKyc();
  const revoke = useRevokeKyc();
  const sync = useSyncKycOnChain();

  const waitingDecision =
    expectedDecision !== null && file.status !== expectedDecision;
  const submitted = file.status === "submitted" && !waitingDecision;
  const approved = file.status === "approved" && !waitingDecision;
  const expiryTime = file.expires_at ? Date.parse(file.expires_at) : NaN;
  const expiryKnown = Number.isFinite(expiryTime);
  const expired = expiryKnown && expiryTime <= Date.now();
  const accountApproved = file.kyc_status === "approved";
  const accountVerified = file.kyc_status === "verified";
  const accountStatusKnown = [
    "none",
    "pending",
    "approved",
    "verified",
    "rejected",
    "revoked",
    "expired",
  ].includes(file.kyc_status ?? "");
  const syncConfirmed = approved && syncResult?.kyc_status === "verified";
  const canSync = approved && expiryKnown && !expired && accountApproved;
  const pending =
    approve.isPending || reject.isPending || revoke.isPending || sync.isPending;

  useEffect(() => {
    if (expectedDecision === file.status) setExpectedDecision(null);
  }, [expectedDecision, file.status]);

  const refresh = async () => {
    const result = await refreshFile();
    if (!result.isError && result.data) setSyncNotice(null);
  };
  const open = (next: Dialog) => {
    setFormError(null);
    setRequestError(null);
    setDialog(next);
  };
  const close = () => setDialog(null);
  const fail = (title: string) => (error: unknown) => {
    setRequestError(errorMessage(error));
    toast.error(title, { description: errorMessage(error) });
  };
  const settled = () => {
    actionLock.current = false;
  };
  const recorded = (status: string, message: string) => {
    setExpectedDecision(status);
    setSyncResult(null);
    setSyncNotice(null);
    setReason("");
    close();
    toast.success(message);
    void refreshFile();
  };

  const runApprove = () => {
    if (pending || actionLock.current) return;
    if (!submitted) {
      setRequestError("The file status changed. Refresh it before deciding.");
      return;
    }
    const iso = expiryDateToIso(expiry);
    if (!iso || new Date(iso).getTime() <= Date.now()) {
      setFormError("Choose a valid expiry date in the future.");
      return;
    }
    actionLock.current = true;
    setRequestError(null);
    approve.mutate(
      { id: file.id, expiresAt: iso },
      {
        onSuccess: () =>
          recorded(
            "approved",
            "KYC approved; registration is a separate step.",
          ),
        onError: fail("Approval failed"),
        onSettled: settled,
      },
    );
  };

  const runWithReason = (kind: "reject" | "revoke") => {
    if (pending || actionLock.current) return;
    if ((kind === "reject" && !submitted) || (kind === "revoke" && !approved)) {
      setRequestError("The file status changed. Refresh it before deciding.");
      return;
    }
    const text = reason.trim();
    if (text.length < 3) {
      setFormError("Enter a reason of at least 3 characters.");
      return;
    }
    const mutation = kind === "reject" ? reject : revoke;
    actionLock.current = true;
    setRequestError(null);
    mutation.mutate(
      { id: file.id, reason: text },
      {
        onSuccess: () =>
          recorded(
            kind === "reject" ? "rejected" : "revoked",
            kind === "reject" ? "KYC rejected" : "KYC revoked",
          ),
        onError: fail(
          kind === "reject" ? "Rejection failed" : "Revocation failed",
        ),
        onSettled: settled,
      },
    );
  };

  const runSync = () => {
    if (pending || actionLock.current) return;
    if (!canSync || expiryTime <= Date.now()) {
      setRequestError(
        "The file, account status or expiry changed. Refresh before registering.",
      );
      return;
    }
    actionLock.current = true;
    setRequestError(null);
    setSyncNotice(null);
    sync.mutate(file.id, {
      onSuccess: (value) => {
        const result = value as KycOnChainSyncResponse | undefined;
        if (
          result?.user_id === file.user_id &&
          result.kyc_status === "verified"
        ) {
          setSyncResult(result);
          toast.success("Registration confirmed by the sync response");
        } else {
          setSyncResult(null);
          setSyncNotice({
            kind: "unknown",
            message:
              "The response did not confirm the account's registration. Refresh the file before retrying.",
          });
        }
        close();
      },
      onError: (error) => {
        setSyncNotice({ kind: "failed", message: errorMessage(error) });
        fail("On-chain registration failed")(error);
      },
      onSettled: settled,
    });
  };

  const steps: (TimelineStep & { hint?: string })[] = [
    {
      key: "submitted",
      label: "Submitted",
      state: "done",
      hint: file.submitted_at
        ? formatDateTime(file.submitted_at)
        : "Submission date unavailable",
    },
    {
      key: "decision",
      label:
        file.status === "rejected"
          ? "Rejected"
          : file.status === "revoked"
            ? "Revoked"
            : submitted
              ? "Compliance decision"
              : file.status === "approved"
                ? "Approved"
                : "Decision",
      state: submitted
        ? "current"
        : file.status === "rejected" || file.status === "revoked"
          ? "failed"
          : file.status === "approved"
            ? "done"
            : "upcoming",
      hint: file.decided_at ? formatDateTime(file.decided_at) : undefined,
    },
    {
      key: "onchain",
      label: "Registry confirmation",
      state: syncConfirmed ? "done" : approved ? "current" : "upcoming",
      hint: syncConfirmed
        ? "Confirmed by the sync response"
        : accountVerified
          ? "Account reports verified; live registry verdict unavailable here"
          : "Not confirmed by this view",
    },
  ];

  let syncBlockReason: string | null = null;
  if (approved && !expiryKnown) {
    syncBlockReason =
      "Approval expiry is unavailable. Refresh the file before registering.";
  } else if (approved && expired) {
    syncBlockReason = "The approval has expired; registration is unavailable.";
  } else if (approved && accountVerified) {
    syncBlockReason =
      "The account reports verified. This page does not provide an independent live registry verdict.";
  } else if (approved && !accountApproved) {
    syncBlockReason = accountStatusKnown
      ? "The account status differs from the approval. Refresh the file before registering."
      : "Account status is unavailable. Refresh the file before registering.";
  }

  return (
    <>
      <PageHeader
        eyebrow={`KYC file #${file.id}`}
        title={file.declared_full_name}
        description={
          <span className="flex flex-wrap items-center gap-2 break-all">
            <KycFileStatusBadge status={file.status} />
            <span>
              {file.email} · User #{file.user_id}
            </span>
          </span>
        }
        breadcrumbs={crumbs}
        actions={
          <>
            {submitted ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => open("reject")}
                  disabled={pending}
                >
                  <XCircle /> Reject
                </Button>
                <Button
                  className="bg-brand text-brand-foreground hover:bg-brand-light"
                  onClick={() => open("approve")}
                  disabled={pending}
                >
                  <CheckCircle2 /> Approve
                </Button>
              </>
            ) : null}
            {approved ? (
              <Button
                variant="outline"
                onClick={() => open("revoke")}
                disabled={pending}
              >
                <Ban /> Revoke
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-6">
        {waitingDecision ? (
          <Alert>
            <ShieldAlert />
            <AlertTitle>Decision recorded; file refresh pending</AlertTitle>
            <AlertDescription>
              The latest file has not yet confirmed the decision. Refresh before
              taking another action.
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refresh()}
                >
                  Refresh file
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
        {approved ? (
          <Alert
            variant={
              syncNotice?.kind === "failed" || expired
                ? "destructive"
                : "default"
            }
          >
            <ShieldAlert />
            <AlertTitle>
              {sync.isPending
                ? "Registration in progress"
                : syncNotice?.kind === "failed"
                  ? "Registration failed"
                  : syncNotice?.kind === "unknown"
                    ? "Registration outcome unavailable"
                    : syncConfirmed
                      ? "Registration confirmed"
                      : expired
                        ? "Approval expired"
                        : "Registration status"}
            </AlertTitle>
            <AlertDescription>
              {sync.isPending
                ? "The registration request is being processed."
                : syncNotice
                  ? syncNotice.message
                  : syncConfirmed
                    ? "The sync response confirmed registration. Account and file updates may follow separately."
                    : syncBlockReason
                      ? syncBlockReason
                      : "The file is approved and the account still reports approved. Registration has not been confirmed by this view."}
              {syncNotice && syncBlockReason ? (
                <p className="mt-2">{syncBlockReason}</p>
              ) : null}
              {!syncConfirmed ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => open("sync")}
                    disabled={
                      !canSync || pending || syncNotice?.kind === "unknown"
                    }
                    className="bg-brand text-brand-foreground hover:bg-brand-light"
                  >
                    <Link2 />{" "}
                    {syncNotice?.kind === "failed"
                      ? "Retry registration"
                      : "Sync on-chain"}
                  </Button>
                  {syncBlockReason || syncNotice?.kind === "unknown" ? (
                    <Button variant="outline" onClick={() => void refresh()}>
                      Refresh file
                    </Button>
                  ) : null}
                </div>
              ) : null}
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
                  {
                    label: "Full name",
                    value: (
                      <span className="break-all">
                        {file.declared_full_name}
                      </span>
                    ),
                  },
                  {
                    label: "Country of residence",
                    value: countryName(file.declared_country_code),
                    hint: `${file.declared_country_code} · ISO numeric ${countryNumeric(file.declared_country_code) ?? "—"}`,
                  },
                  {
                    label: "Submitted",
                    value: file.submitted_at
                      ? formatDateTime(file.submitted_at)
                      : "Unavailable",
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
                    value: <span className="break-all">{file.email}</span>,
                  },
                  {
                    label: "Account KYC status",
                    value: accountStatusKnown ? (
                      <KycStatusBadge status={file.kyc_status} />
                    ) : (
                      "Unavailable"
                    ),
                  },
                  {
                    label: "Account verification date",
                    value: file.kyc_verified_at
                      ? formatDateTime(file.kyc_verified_at)
                      : "Unavailable",
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
                  { label: "Decided", value: formatDateTime(file.decided_at) },
                  {
                    label: "Decided by",
                    value: file.decided_by ? `User #${file.decided_by}` : "—",
                  },
                  {
                    label: "Valid until",
                    value: expiryKnown
                      ? formatDate(file.expires_at)
                      : "Unavailable",
                  },
                  ...(file.rejection_reason
                    ? [
                        {
                          label: "Rejection reason",
                          value: (
                            <span className="whitespace-pre-wrap break-all font-normal">
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
                            <span className="whitespace-pre-wrap break-all font-normal">
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
                title="Registration response"
                description="Returned by the sync operation in this session."
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
                      label: "Account status returned",
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
        onOpenChange={(value) => !value && close()}
        title="Approve identity verification"
        description={
          <span className="break-all">
            Approve {file.declared_full_name}&apos;s file for account #
            {file.user_id}. Registration remains a separate step.
          </span>
        }
        confirmLabel="Approve"
        pending={pending}
        onConfirm={runApprove}
      >
        <FormField label="Approval valid until" htmlFor="kyc-expiry" required>
          <Input
            id="kyc-expiry"
            type="date"
            required
            value={expiry}
            min={new Date().toISOString().slice(0, 10)}
            aria-invalid={!!formError}
            aria-describedby={
              formError ? "kyc-expiry-error" : "kyc-expiry-hint"
            }
            onChange={(event) => {
              setExpiry(event.target.value);
              setFormError(null);
            }}
          />
          {formError ? (
            <p
              id="kyc-expiry-error"
              className="text-xs text-red-600"
              role="alert"
            >
              {formError}
            </p>
          ) : (
            <p id="kyc-expiry-hint" className="text-xs text-muted-foreground">
              The selected date is interpreted at 00:00 UTC and must be in the
              future.
            </p>
          )}
        </FormField>
        {requestError ? (
          <p role="alert" className="text-sm text-red-700">
            {requestError}
          </p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "reject" || dialog === "revoke"}
        onOpenChange={(value) => !value && close()}
        title={
          dialog === "revoke"
            ? "Revoke identity verification"
            : "Reject identity verification"
        }
        description={
          <span className="break-all">
            Record this decision for {file.declared_full_name}, account #
            {file.user_id}. The investor may submit a new file.
          </span>
        }
        confirmLabel={dialog === "revoke" ? "Revoke" : "Reject"}
        destructive
        pending={pending}
        onConfirm={() =>
          runWithReason(dialog === "revoke" ? "revoke" : "reject")
        }
      >
        <FormField label="Reason" htmlFor="kyc-reason" required>
          <Textarea
            id="kyc-reason"
            value={reason}
            required
            rows={4}
            maxLength={500}
            aria-invalid={!!formError}
            aria-describedby={
              formError ? "kyc-reason-error" : "kyc-reason-hint"
            }
            onChange={(event) => {
              setReason(event.target.value);
              setFormError(null);
            }}
          />
          {formError ? (
            <p
              id="kyc-reason-error"
              className="text-xs text-red-600"
              role="alert"
            >
              {formError}
            </p>
          ) : (
            <p id="kyc-reason-hint" className="text-xs text-muted-foreground">
              Kept in the compliance record.
            </p>
          )}
        </FormField>
        {requestError ? (
          <p role="alert" className="text-sm text-red-700">
            {requestError}
          </p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "sync"}
        onOpenChange={(value) => !value && close()}
        title="Register investor on-chain"
        description={`Register account #${file.user_id} for ${countryName(file.declared_country_code)}. This operation may perform blockchain transactions.`}
        confirmLabel="Register on-chain"
        pending={pending}
        onConfirm={runSync}
      >
        {requestError ? (
          <p role="alert" className="text-sm text-red-700">
            {requestError}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
