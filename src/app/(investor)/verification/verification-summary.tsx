"use client";

import Link from "next/link";
import { HashValue } from "@/components/app/hash-value";
import { KeyValueList } from "@/components/app/key-value";
import { Panel, PanelBody } from "@/components/app/panel";
import { KycStatusBadge } from "@/components/app/status-badges";
import { Button } from "@/components/ui/button";
import { useMyKycOnChain } from "@/lib/api/hooks";
import type { User } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import {
  type InvestorVerificationKind,
  investorVerificationState,
  type RegistryVerdict,
  registryVerdict,
} from "@/lib/kyc-review";

const COPY: Record<InvestorVerificationKind, { title: string; body: string }> =
  {
    required: {
      title: "Verification required",
      body: "Submit your identity declaration before subscribing.",
    },
    under_review: {
      title: "Under review",
      body: "Your identity declaration is being reviewed.",
    },
    registration_pending: {
      title: "Registration pending",
      body: "Your declaration was approved. Registry confirmation is still required before eligibility can be confirmed.",
    },
    ready: {
      title: "Ready to invest",
      body: "Your account verification and the registry verdict are confirmed. Individual offering conditions still apply.",
    },
    renewal: {
      title: "Renewal required",
      body: "Your verification has expired. Submit a new declaration to renew it.",
    },
    rejected: {
      title: "Verification rejected",
      body: "You may submit a new identity declaration.",
    },
    revoked: {
      title: "Verification revoked",
      body: "You may submit a new identity declaration.",
    },
    checking: {
      title: "Checking eligibility",
      body: "The registry verdict is being checked before eligibility can be confirmed.",
    },
    unavailable: {
      title: "Eligibility unavailable",
      body: "The account status, validity date or registry verdict is unavailable. Eligibility cannot be confirmed.",
    },
    conflict: {
      title: "Verification statuses differ",
      body: "The account status or validity date conflicts with the registry verdict. Eligibility is not confirmed; refresh both statuses.",
    },
  };

const REGISTRY_LABEL: Record<RegistryVerdict, string> = {
  checking: "Checking",
  verified: "Verified",
  not_verified: "Not verified",
  unavailable: "Unavailable",
};

export function useInvestorVerification(user: User, poll = false) {
  const registry = useMyKycOnChain(poll ? 5000 : false);
  const verdict = registryVerdict(registry.data, {
    userId: user.id,
    loading: registry.isLoading,
    error: registry.isError,
  });
  const state = investorVerificationState({
    status: user.kyc_status,
    expiresAt: user.kyc_expires_at,
    registry: verdict,
  });
  return { registry, verdict, state };
}

export function VerificationSummary({
  user,
  verification,
  refreshUser,
  profile = false,
}: {
  user: User;
  verification: ReturnType<typeof useInvestorVerification>;
  refreshUser: () => Promise<unknown>;
  profile?: boolean;
}) {
  const { registry, verdict, state } = verification;
  const copy = COPY[state.kind];
  const body =
    state.kind === "renewal" && user.kyc_status === "verified"
      ? "The account still says verified, but its validity has expired. Submit a new declaration to renew it."
      : copy.body;
  const knownStatus = [
    "none",
    "pending",
    "approved",
    "verified",
    "rejected",
    "revoked",
    "expired",
  ].includes(user.kyc_status ?? "");
  const wallet =
    verdict !== "unavailable" && registry.data?.user_id === user.id
      ? registry.data.wallet_address
      : undefined;
  const expiry = formatDate(user.kyc_expires_at);

  return (
    <Panel>
      <PanelBody className="space-y-4">
        <div aria-live="polite">
          <h2 className="text-lg font-semibold text-ink">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
        <KeyValueList
          items={[
            {
              label: "Account verification",
              value: knownStatus ? (
                <KycStatusBadge status={user.kyc_status} />
              ) : (
                "Unavailable"
              ),
            },
            { label: "Registry verdict", value: REGISTRY_LABEL[verdict] },
            {
              label: "Valid until",
              value: expiry === "—" ? "Unavailable" : expiry,
            },
          ]}
        />
        {verdict === "unavailable" ? (
          <p className="text-sm text-muted-foreground">
            The registry verdict could not be confirmed. Retry the check.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {verdict === "unavailable" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void registry.refetch()}
              disabled={registry.isFetching}
            >
              {registry.isFetching
                ? "Checking registry…"
                : "Retry registry check"}
            </Button>
          ) : null}
          {state.kind === "conflict" || state.kind === "unavailable" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refreshUser();
                void registry.refetch();
              }}
            >
              Refresh statuses
            </Button>
          ) : null}
          {profile ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/verification">View verification</Link>
            </Button>
          ) : state.kind === "ready" ? (
            <Button asChild size="sm">
              <Link href="/explore">Browse offerings</Link>
            </Button>
          ) : null}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-ink">
            Technical details
          </summary>
          <div className="mt-2 text-muted-foreground">
            <p>
              The registry verdict is read separately from your account status.
            </p>
            {wallet ? (
              <p className="mt-2 break-all">
                Wallet: <HashValue value={wallet} />
              </p>
            ) : null}
          </div>
        </details>
      </PanelBody>
    </Panel>
  );
}
