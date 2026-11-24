"use client";

import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, Fingerprint } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormField } from "@/components/app/form-field";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contractApi } from "@/lib/api/endpoints";
import type { AddClaimRequest, CreateIdentityRequest } from "@/lib/api/types";
import { COUNTRIES, countryName, KYC_CLAIM_TOPIC } from "@/lib/reference";
import { FieldMessages, fieldDescription } from "./field-messages";
import { ResultPanel } from "./result-panel";

function parsePositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function IdentityConsole() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Use the{" "}
        <Link
          href="/admin/compliance"
          className="font-medium text-ink underline underline-offset-4"
        >
          compliance workflow
        </Link>{" "}
        to approve a KYC file and sync it on-chain. These low-level operations
        are for exceptional cases after independently checking the account and
        its on-chain state.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <CreateIdentityForm />
        <AddClaimForm />
      </div>
    </div>
  );
}

function CreateIdentityForm() {
  const [userId, setUserId] = useState("");
  const [country, setCountry] = useState("LU");
  const [errors, setErrors] = useState<{ userId?: string }>({});
  const [pendingBody, setPendingBody] = useState<CreateIdentityRequest | null>(
    null,
  );
  const mutation = useMutation({
    mutationFn: (body: CreateIdentityRequest) =>
      contractApi.createIdentity(body),
  });
  const numeric = COUNTRIES.find((c) => c.code === country)?.numeric;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parsePositiveInt(userId);
    if (!id) {
      setErrors({ userId: "Enter a valid user ID." });
      return;
    }
    if (!numeric) return;
    setErrors({});
    setPendingBody({ userId: id, countryCode: numeric });
  };

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <Fingerprint className="size-4 text-muted-foreground" aria-hidden />
            Create on-chain identity
          </span>
        }
        description="Deploys an ONCHAINID for the investor's wallet and adds it to the identity registry."
      />
      <PanelBody className="space-y-4">
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="User ID" htmlFor="identity-user" required>
              <Input
                id="identity-user"
                inputMode="numeric"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. 3"
                required
                aria-invalid={!!errors.userId}
                aria-describedby={fieldDescription(
                  "identity-user",
                  errors.userId,
                )}
              />
              <FieldMessages id="identity-user" error={errors.userId} />
            </FormField>
            <FormField
              label="Country of residence"
              htmlFor="identity-country"
              required
            >
              <Select value={country} onValueChange={setCountry} required>
                <SelectTrigger
                  id="identity-country"
                  className="w-full"
                  aria-describedby="identity-country-hint"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldMessages
                id="identity-country"
                hint={`ISO 3166-1 numeric ${numeric ?? "—"}`}
              />
            </FormField>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            Create identity
          </Button>
        </form>
        <ResultPanel
          data={mutation.isSuccess ? (mutation.data ?? null) : undefined}
          error={mutation.error}
          endpoint="POST /contract/identity"
        />
      </PanelBody>
      <ConfirmDialog
        open={!!pendingBody}
        onOpenChange={(o) => !o && setPendingBody(null)}
        title="Create on-chain identity?"
        description={
          pendingBody
            ? `Deploys an identity for user #${pendingBody.userId}, resident in ${countryName(country)} (${pendingBody.countryCode}). A user can only hold one identity.`
            : undefined
        }
        confirmLabel="Create identity"
        pending={mutation.isPending}
        onConfirm={() =>
          pendingBody &&
          mutation.mutate(pendingBody, {
            onSettled: () => setPendingBody(null),
          })
        }
      />
    </Panel>
  );
}

function AddClaimForm() {
  const [userId, setUserId] = useState("");
  const [topic, setTopic] = useState(String(KYC_CLAIM_TOPIC));
  const [errors, setErrors] = useState<{ userId?: string; topic?: string }>({});
  const [pendingBody, setPendingBody] = useState<AddClaimRequest | null>(null);
  const mutation = useMutation({
    mutationFn: (body: AddClaimRequest) => contractApi.addClaim(body),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parsePositiveInt(userId);
    const t = /^\d+$/.test(topic.trim()) ? Number(topic) : null;
    const next = {
      userId: id ? undefined : "Enter a valid user ID.",
      topic: t === null ? "Enter a numeric claim topic." : undefined,
    };
    setErrors(next);
    if (!id || t === null) return;
    setPendingBody({ userId: id, claimTopic: t });
  };

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <BadgeCheck className="size-4 text-muted-foreground" aria-hidden />
            Issue claim
          </span>
        }
        description="Signs a claim from the platform's trusted issuer and attaches it to the investor's identity."
      />
      <PanelBody className="space-y-4">
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="User ID" htmlFor="claim-user" required>
              <Input
                id="claim-user"
                inputMode="numeric"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. 3"
                required
                aria-invalid={!!errors.userId}
                aria-describedby={fieldDescription("claim-user", errors.userId)}
              />
              <FieldMessages id="claim-user" error={errors.userId} />
            </FormField>
            <FormField label="Claim topic" htmlFor="claim-topic" required>
              <Input
                id="claim-topic"
                inputMode="numeric"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="tabular"
                required
                aria-invalid={!!errors.topic}
                aria-describedby={fieldDescription(
                  "claim-topic",
                  errors.topic,
                  true,
                )}
              />
              <FieldMessages
                id="claim-topic"
                error={errors.topic}
                hint={`${KYC_CLAIM_TOPIC} = KYC (required by the platform suite)`}
              />
            </FormField>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            Issue claim
          </Button>
        </form>
        <ResultPanel
          data={mutation.isSuccess ? (mutation.data ?? null) : undefined}
          error={mutation.error}
          endpoint="POST /contract/identity/claims/add"
        />
      </PanelBody>
      <ConfirmDialog
        open={!!pendingBody}
        onOpenChange={(o) => !o && setPendingBody(null)}
        title="Issue claim?"
        description={
          pendingBody
            ? `Adds a topic ${pendingBody.claimTopic} claim to the identity of user #${pendingBody.userId}.`
            : undefined
        }
        confirmLabel="Issue claim"
        pending={mutation.isPending}
        onConfirm={() =>
          pendingBody &&
          mutation.mutate(pendingBody, {
            onSettled: () => setPendingBody(null),
          })
        }
      />
    </Panel>
  );
}
