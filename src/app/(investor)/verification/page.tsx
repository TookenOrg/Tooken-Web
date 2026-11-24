"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/app/form-field";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/app/states";
import { TookenLoader } from "@/components/app/tooken-loader";
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
import type { RegistryVerdict } from "@/lib/kyc-review";
import { COUNTRIES } from "@/lib/reference";
import { kycStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  useInvestorVerification,
  VerificationSummary,
} from "./verification-summary";

const CRUMBS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Identity verification" },
];

type StepState = "done" | "current" | "upcoming" | "failed";

function kycSteps(status: string, registry: RegistryVerdict) {
  const filed = status !== "none";
  const decided = ["approved", "verified", "expired"].includes(status);
  const failed = status === "rejected" || status === "revoked";
  const registryState: StepState =
    registry === "verified" ? "done" : decided ? "current" : "upcoming";
  return [
    {
      label: "Declaration",
      hint: filed ? "Submitted" : "Not submitted",
      state: (filed ? "done" : "current") as StepState,
    },
    {
      label: "Compliance decision",
      hint: failed
        ? status === "rejected"
          ? "Rejected"
          : "Revoked"
        : decided
          ? "Decision recorded"
          : "Awaiting review",
      state: (failed
        ? "failed"
        : decided
          ? "done"
          : filed
            ? "current"
            : "upcoming") as StepState,
    },
    {
      label: "Registry verdict",
      hint:
        registry === "verified"
          ? "Verified"
          : registry === "not_verified"
            ? "Not verified"
            : registry === "checking"
              ? "Checking"
              : "Unavailable",
      state: registryState,
    },
  ];
}

export default function VerificationPage() {
  const { user, userLoading, isInvestor, isStaff, refreshUser } = useSession();
  if (userLoading) return <PageSkeleton />;
  if (!user) {
    return (
      <>
        <PageHeader title="Identity verification" breadcrumbs={CRUMBS} />
        <Panel>
          <ErrorState
            error={new Error("Account details are unavailable.")}
            onRetry={() => void refreshUser()}
          />
        </Panel>
      </>
    );
  }
  if (!isInvestor) {
    return (
      <>
        <PageHeader title="Identity verification" breadcrumbs={CRUMBS} />
        <Panel>
          <EmptyState
            title={
              isStaff
                ? "Verification is for investor accounts"
                : "Account role unavailable"
            }
            description={
              isStaff
                ? "Use the back office for staff operations."
                : "Refresh your account before continuing."
            }
            action={
              isStaff ? (
                <Button asChild variant="outline">
                  <Link href="/admin">Back office</Link>
                </Button>
              ) : (
                <Button variant="outline" onClick={() => void refreshUser()}>
                  Refresh account
                </Button>
              )
            }
          />
        </Panel>
      </>
    );
  }
  return (
    <VerificationContent key={user.id} user={user} refreshUser={refreshUser} />
  );
}

function VerificationContent({
  user,
  refreshUser,
}: {
  user: User;
  refreshUser: () => Promise<unknown>;
}) {
  const status = user.kyc_status;
  const inProgress = status === "pending" || status === "approved";
  const verification = useInvestorVerification(user, inProgress);

  useEffect(() => {
    if (!inProgress) return;
    const id = window.setInterval(() => {
      void refreshUser();
    }, 5000);
    return () => window.clearInterval(id);
  }, [inProgress, refreshUser]);

  const filingStatus =
    verification.state.kind === "renewal" ? "expired" : (status ?? "");
  const filingBlock =
    verification.state.kind === "conflict"
      ? "Refresh the conflicting statuses before submitting a declaration."
      : verification.verdict === "checking"
        ? "Wait for the registry check before submitting a declaration."
        : verification.verdict === "unavailable"
          ? "Retry the registry check before submitting a declaration."
          : undefined;
  const knownStatus = [
    "none",
    "pending",
    "approved",
    "verified",
    "rejected",
    "revoked",
    "expired",
  ].includes(status ?? "");

  return (
    <div>
      <PageHeader
        breadcrumbs={CRUMBS}
        title="Identity verification"
        description="Review your identity verification and eligibility to subscribe."
      />
      <div className="space-y-6">
        <VerificationSummary
          user={user}
          verification={verification}
          refreshUser={refreshUser}
        />
        {inProgress ? (
          <p className="text-xs text-muted-foreground">
            Account and registry statuses are checked every 5 seconds.
          </p>
        ) : null}
        {verification.state.canFile ? (
          <KycForm
            user={user}
            status={filingStatus}
            blockedReason={filingBlock}
            refreshUser={refreshUser}
          />
        ) : null}
        {knownStatus ? (
          <Panel>
            <PanelHeader title="Verification progress" />
            <PanelBody>
              <ol
                className="grid gap-4 sm:grid-cols-3"
                aria-label="Verification progress"
              >
                {kycSteps(status as string, verification.verdict).map(
                  (step, index) => (
                    <li
                      key={step.label}
                      className="flex items-start gap-3"
                      aria-current={
                        step.state === "current" ? "step" : undefined
                      }
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          step.state === "done" &&
                            "border-emerald-500 bg-emerald-500 text-white",
                          step.state === "current" &&
                            "border-brand bg-amber-50 text-amber-700",
                          step.state === "upcoming" &&
                            "border-border text-muted-foreground",
                          step.state === "failed" &&
                            "border-red-500 bg-red-50 text-red-700",
                        )}
                      >
                        {step.state === "done" ? (
                          <Check className="size-3.5" aria-hidden />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-ink">
                          {step.label}
                          <span className="sr-only"> ({step.state})</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {step.hint}
                        </div>
                      </div>
                    </li>
                  ),
                )}
              </ol>
            </PanelBody>
          </Panel>
        ) : null}
        <details className="rounded-md border border-border bg-card p-5 text-sm">
          <summary className="cursor-pointer font-medium text-ink">
            How verification works
          </summary>
          <p className="mt-3 text-muted-foreground">
            Declare your legal name and country of residence. After compliance
            approval, a separate technical registration may be needed before the
            registry confirms your verification.
          </p>
        </details>
      </div>
    </div>
  );
}

function KycForm({
  user,
  status,
  blockedReason,
  refreshUser,
}: {
  user: User;
  status: string;
  blockedReason: string | undefined;
  refreshUser: () => Promise<unknown>;
}) {
  const submit = useSubmitKyc();
  const submitting = useRef(false);
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [country, setCountry] = useState(user.country_code ?? "");
  const [certify, setCertify] = useState(false);
  const [touched, setTouched] = useState(false);
  const validCountry = COUNTRIES.some((item) => item.code === country);
  const nameError =
    touched && fullName.trim().length < 2
      ? "Enter your full legal name."
      : undefined;
  const countryError =
    touched && !validCountry ? "Select your country of residence." : undefined;
  const certifyError =
    touched && !certify ? "Confirm the declaration to continue." : undefined;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (
      blockedReason ||
      submitting.current ||
      submit.isPending ||
      fullName.trim().length < 2 ||
      !validCountry ||
      !certify
    )
      return;
    submitting.current = true;
    submit.mutate(
      { declared_full_name: fullName.trim(), declared_country_code: country },
      {
        onSuccess: async () => {
          toast.success("Verification submitted", {
            description: "Your declaration was submitted for review.",
          });
          await refreshUser();
        },
        onSettled: () => {
          submitting.current = false;
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
        {status !== "none" && meta.description ? (
          <p className="mb-5 text-sm text-muted-foreground">
            {meta.description} You may submit a new declaration below.
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <p className="text-sm text-muted-foreground">
            Complete both fields and confirm the declaration.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Full legal name" htmlFor="kyc-name" required>
              <Input
                id="kyc-name"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                aria-invalid={!!nameError}
                aria-describedby={
                  nameError ? "kyc-name-error" : "kyc-name-hint"
                }
                maxLength={200}
              />
              {nameError ? (
                <p
                  id="kyc-name-error"
                  className="text-xs text-red-600"
                  role="alert"
                >
                  {nameError}
                </p>
              ) : (
                <p id="kyc-name-hint" className="text-xs text-muted-foreground">
                  First and last names, as on your passport or ID card.
                </p>
              )}
            </FormField>
            <FormField
              label="Country of residence"
              htmlFor="kyc-country"
              required
            >
              <Select value={country} onValueChange={setCountry} required>
                <SelectTrigger
                  id="kyc-country"
                  className="w-full"
                  aria-required="true"
                  aria-invalid={!!countryError}
                  aria-describedby={
                    countryError ? "kyc-country-error" : undefined
                  }
                >
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {[...COUNTRIES]
                    .sort((a, b) => a.name.localeCompare(b.name, "en-GB"))
                    .map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {countryError ? (
                <p
                  id="kyc-country-error"
                  className="text-xs text-red-600"
                  role="alert"
                >
                  {countryError}
                </p>
              ) : null}
            </FormField>
          </div>
          <div>
            <label
              htmlFor="kyc-certify"
              className="flex cursor-pointer gap-3 rounded-md border border-border p-3 text-sm hover:bg-muted/40"
            >
              <Checkbox
                id="kyc-certify"
                checked={certify}
                onCheckedChange={(value) => setCertify(value === true)}
                aria-required="true"
                aria-invalid={!!certifyError}
                aria-describedby={
                  certifyError ? "kyc-certify-error" : undefined
                }
                className="mt-0.5"
              />
              <span>
                I certify that the information provided is accurate and
                complete, and I consent to its processing for identity
                verification.
              </span>
            </label>
            {certifyError ? (
              <p
                id="kyc-certify-error"
                className="mt-1.5 text-xs text-red-600"
                role="alert"
              >
                {certifyError}
              </p>
            ) : null}
          </div>
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
          {blockedReason ? (
            <p className="text-sm text-amber-800" id="kyc-blocked">
              {blockedReason}
            </p>
          ) : submit.isPending ? (
            <p className="text-sm text-muted-foreground" id="kyc-blocked">
              Submission in progress.
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!!blockedReason || submit.isPending}
              aria-describedby={
                blockedReason || submit.isPending ? "kyc-blocked" : undefined
              }
              className="bg-brand text-brand-foreground hover:bg-brand-light"
            >
              {submit.isPending ? <TookenLoader size={16} /> : null}
              Submit for review
            </Button>
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}
