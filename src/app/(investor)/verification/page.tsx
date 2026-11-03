"use client";

import {
  ArrowRight,
  Check,
  Clock,
  Fingerprint,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/app/form-field";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { PageSkeleton } from "@/components/app/states";
import { KycStatusBadge } from "@/components/app/status-badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useSubmitKyc } from "@/lib/api/hooks";
import type { User } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import { formatDate, formatDateTime } from "@/lib/format";
import { COUNTRIES, countryName } from "@/lib/reference";
import { canInvest, kycStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

const CRUMBS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Identity verification" },
];

type StepState = "done" | "current" | "upcoming" | "failed";

function kycSteps(
  status: string,
): { label: string; hint: string; state: StepState }[] {
  const reached =
    status === "pending"
      ? 1
      : status === "approved"
        ? 2
        : status === "verified"
          ? 4
          : 0;
  const labels = [
    { label: "Submitted", hint: "Declaration received" },
    { label: "Compliance review", hint: "Checked by our compliance team" },
    { label: "On-chain identity", hint: "ONCHAINID claim registered" },
    { label: "Verified", hint: "Eligible to hold security tokens" },
  ];
  return labels.map((l, i) => ({
    ...l,
    state: i < reached ? "done" : i === reached ? "current" : "upcoming",
  }));
}

export default function VerificationPage() {
  const { user, userLoading, refreshUser } = useSession();
  const status = user?.kyc_status ?? "none";
  const inProgress = status === "pending" || status === "approved";

  useEffect(() => {
    if (!inProgress) return;
    const id = window.setInterval(() => {
      refreshUser();
    }, 5000);
    return () => window.clearInterval(id);
  }, [inProgress, refreshUser]);

  if (userLoading || !user) return <PageSkeleton />;

  const expiredVerified =
    status === "verified" && !canInvest(status, user.kyc_expires_at);
  const canFile =
    ["none", "rejected", "revoked", "expired"].includes(status) ||
    expiredVerified;

  return (
    <div>
      <PageHeader
        breadcrumbs={CRUMBS}
        title="Identity verification"
        description="Security tokens (ERC-3643) can only be held by investors whose identity has been verified and registered on-chain."
        actions={
          <KycStatusBadge status={expiredVerified ? "expired" : status} />
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canFile ? (
            <KycForm
              user={user}
              status={expiredVerified ? "expired" : status}
            />
          ) : (
            <StatusPanel user={user} status={status} />
          )}
        </div>
        <aside className="space-y-6">
          <Panel>
            <PanelHeader title="How verification works" />
            <PanelBody>
              <ol className="space-y-4 text-sm">
                {[
                  {
                    t: "Declare your identity",
                    d: "Full legal name and country of residence.",
                  },
                  {
                    t: "Compliance review",
                    d: "Our compliance officers review your declaration.",
                  },
                  {
                    t: "On-chain registration",
                    d: "A KYC claim is attached to your ONCHAINID so the token contract recognises you.",
                  },
                  {
                    t: "Start investing",
                    d: "Verification is valid for a limited period and must be renewed.",
                  },
                ].map((s, i) => (
                  <li key={s.t} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink/5 text-xs font-semibold text-ink tabular">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium text-ink">{s.t}</div>
                      <div className="text-xs text-muted-foreground">{s.d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </PanelBody>
          </Panel>
          <p className="px-1 text-xs text-muted-foreground">
            Your personal data is processed in accordance with applicable
            AML/KYC regulations and is only used to establish your eligibility.
          </p>
        </aside>
      </div>
    </div>
  );
}

function KycForm({ user, status }: { user: User; status: string }) {
  const { refreshUser } = useSession();
  const submit = useSubmitKyc();
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [country, setCountry] = useState(user.country_code ?? "");
  const [certify, setCertify] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameError =
    touched && fullName.trim().length < 2
      ? "Enter your full legal name."
      : undefined;
  const countryError =
    touched && !country ? "Select your country of residence." : undefined;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (fullName.trim().length < 2 || !country || !certify) return;
    submit.mutate(
      {
        declared_full_name: fullName.trim(),
        declared_country_code: country,
      },
      {
        onSuccess: async () => {
          toast.success("Verification submitted", {
            description: "Our compliance team will review your file shortly.",
          });
          await refreshUser();
        },
      },
    );
  };

  const meta = kycStatusMeta(status);
  const conflict =
    submit.error instanceof ApiError && submit.error.status === 409;

  return (
    <Panel>
      <PanelHeader
        title={
          status === "none"
            ? "Submit your verification"
            : "File a new verification"
        }
        description="Declare your identity exactly as it appears on your official ID document."
      />
      <PanelBody>
        {status !== "none" ? (
          <div
            className={cn(
              "mb-5 flex gap-2 rounded-md border px-3 py-2.5 text-sm",
              meta.tone === "danger"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-900",
            )}
          >
            <X className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              {meta.description} You may file a new verification below. Contact
              support if you need details about the previous decision.
            </p>
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Full legal name"
              htmlFor="kyc-name"
              required
              error={nameError}
              hint="First and last names, as on your passport or ID card."
            >
              <Input
                id="kyc-name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                aria-invalid={!!nameError}
                maxLength={200}
              />
            </FormField>
            <FormField
              label="Country of residence"
              htmlFor="kyc-country"
              required
              error={countryError}
            >
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger
                  id="kyc-country"
                  className="w-full"
                  aria-invalid={!!countryError}
                >
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {[...COUNTRIES]
                    .sort((a, b) => a.name.localeCompare(b.name, "en-GB"))
                    .map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <label
            htmlFor="kyc-certify"
            className="flex cursor-pointer gap-3 rounded-md border border-border p-3 text-sm hover:bg-muted/40"
          >
            <Checkbox
              id="kyc-certify"
              checked={certify}
              onCheckedChange={(v) => setCertify(v === true)}
              className="mt-0.5"
            />
            <span>
              I certify that the information provided is accurate and complete,
              and I consent to its processing for identity verification.
            </span>
          </label>
          {submit.isError ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            >
              {conflict
                ? "A verification is already under review or still valid for your account."
                : errorMessage(submit.error)}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!certify || submit.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand-light"
            >
              {submit.isPending ? <Loader2 className="animate-spin" /> : null}
              Submit for review
            </Button>
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}

function StatusPanel({ user, status }: { user: User; status: string }) {
  const steps = kycSteps(status);
  const verified = status === "verified";
  const Icon = verified
    ? ShieldCheck
    : status === "approved"
      ? Fingerprint
      : Clock;
  const title = verified
    ? "Your identity is verified"
    : status === "approved"
      ? "Approved, on-chain registration pending"
      : "Under review";
  const body = verified
    ? "You are eligible to subscribe to offerings open on the marketplace."
    : status === "approved"
      ? "Compliance has approved your file. Your on-chain identity is being registered; this usually takes a few moments."
      : "Our compliance team is reviewing your declaration. This page refreshes automatically.";

  return (
    <>
      <Panel>
        <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full",
              verified
                ? "bg-emerald-50 text-emerald-600"
                : "bg-cyan-50 text-cyan-700",
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
            {!verified ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-cyan-500" />
                Checking for updates every 5 seconds
              </p>
            ) : null}
          </div>
          {verified ? (
            <Button
              asChild
              className="bg-brand text-brand-foreground hover:bg-brand-light"
            >
              <Link href="/explore">
                Browse offerings <ArrowRight />
              </Link>
            </Button>
          ) : null}
        </PanelBody>
        <div className="border-t border-border px-5 py-5">
          <ol
            className="grid gap-4 sm:grid-cols-4"
            aria-label="Verification progress"
          >
            {steps.map((s, i) => (
              <li
                key={s.label}
                className="flex items-start gap-3 sm:flex-col sm:gap-2"
                aria-current={s.state === "current" ? "step" : undefined}
              >
                <span
                  className={cn(
                    "relative flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular",
                    s.state === "done" &&
                      "border-emerald-500 bg-emerald-500 text-white",
                    s.state === "current" &&
                      "border-brand bg-amber-50 text-amber-700",
                    s.state === "upcoming" &&
                      "border-border text-muted-foreground",
                  )}
                >
                  {s.state === "current" ? (
                    <span className="absolute inset-0 animate-ping rounded-full bg-amber-300/40" />
                  ) : null}
                  {s.state === "done" ? <Check className="size-3.5" /> : i + 1}
                </span>
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      s.state === "upcoming"
                        ? "text-muted-foreground"
                        : "text-ink",
                    )}
                  >
                    {s.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.hint}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Verification record" />
        <PanelBody>
          <KeyValueList
            items={[
              { label: "Status", value: <KycStatusBadge status={status} /> },
              { label: "Holder", value: user.full_name },
              {
                label: "Country of residence",
                value: user.country_code ? countryName(user.country_code) : "—",
              },
              {
                label: "Verified on",
                value: formatDateTime(user.kyc_verified_at),
              },
              {
                label: "Valid until",
                value: formatDate(user.kyc_expires_at),
              },
            ]}
          />
        </PanelBody>
      </Panel>
    </>
  );
}
