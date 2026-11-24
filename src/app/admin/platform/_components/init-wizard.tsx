"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Play } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { StatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { platformApi } from "@/lib/api/endpoints";
import { ResultPanel } from "./result-panel";

type InitStep = {
  key: string;
  title: string;
  description: string;
  endpoint: string;
  async: boolean;
  run: () => Promise<unknown>;
};

const STEPS: InitStep[] = [
  {
    key: "implementations",
    title: "Deploy contract implementations",
    description:
      "Deploys the T-REX logic contracts (token, identity registry, storage, compliance, trusted issuers, claim topics) behind which every proxy points.",
    endpoint: "POST /trex/init/implementations",
    async: true,
    run: platformApi.deployImplementations,
  },
  {
    key: "identity-factory",
    title: "Deploy identity factory",
    description:
      "Deploys the ONCHAINID factory used to create one identity contract per investor.",
    endpoint: "POST /trex/init/contract/factory/identity",
    async: false,
    run: platformApi.deployIdentityFactory,
  },
  {
    key: "authority",
    title: "Configure implementation authority",
    description:
      "Registers the implementation addresses in the Authority contract so proxies resolve to the right version.",
    endpoint: "POST /trex/init/authority/configure",
    async: false,
    run: platformApi.configureAuthority,
  },
  {
    key: "trex-factory",
    title: "Deploy T-REX factory",
    description:
      "Deploys the factory that instantiates a complete ERC-3643 suite for every tokenized asset.",
    endpoint: "POST /trex/init/contract/factory/trexFactory",
    async: true,
    run: platformApi.deployTrexFactory,
  },
  {
    key: "suite",
    title: "Deploy the platform T-REX suite",
    description:
      "Deploys the shared identity registry, compliance and claim registries used by the platform.",
    endpoint: "POST /trex/init/suite/deploy",
    async: true,
    run: platformApi.deploySuite,
  },
];

export function InitWizard() {
  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle />
        <AlertTitle>Verify prerequisites before bootstrap</AlertTitle>
        <AlertDescription>
          <p>
            Verify the target network and environment independently, then
            confirm each preceding step has completed before continuing. These
            operations are not idempotent: repeating a step may deploy duplicate
            contracts or disconnect existing tokens.
          </p>
          <p>
            After a partial failure, use deployment records to identify
            unfinished steps before resuming. The suite lookup cannot verify
            every bootstrap step. HTTP 202 means a request was accepted, not
            that its on-chain work succeeded.
          </p>
        </AlertDescription>
      </Alert>
      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={step.key}>
            <InitStepCard step={step} index={i + 1} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function InitStepCard({ step, index }: { step: InitStep; index: number }) {
  const [open, setOpen] = useState(false);
  const mutation = useMutation({ mutationFn: step.run });

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white tabular">
              {index}
            </span>
            {step.title}
          </span>
        }
        actions={
          <>
            <StatusBadge tone={step.async ? "info" : "neutral"}>
              {step.async ? "Asynchronous" : "Synchronous response"}
            </StatusBadge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(true)}
              disabled={mutation.isPending}
            >
              <Play /> Run
            </Button>
          </>
        }
      />
      <PanelBody className="space-y-3 py-4">
        <p className="text-sm text-muted-foreground">{step.description}</p>
        <ResultPanel
          data={mutation.isSuccess ? (mutation.data ?? null) : undefined}
          error={mutation.error}
          endpoint={step.endpoint}
          status={
            step.async
              ? "Request accepted. HTTP 202 does not confirm on-chain completion; verify the outcome before continuing or retrying."
              : "Response received. Verify the outcome before continuing."
          }
        />
      </PanelBody>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Run step ${index}: ${step.title}?`}
        description={
          <div className="space-y-2">
            <p>
              <strong>
                Verify the target and prerequisites independently.
              </strong>{" "}
              Run this only for a new deployment or to resume a verified
              unfinished step after a partial failure. This operation is not
              idempotent and sends real blockchain transactions.
            </p>
            <p>
              Network and environment are not provided by this console. Confirm
              them before proceeding.
            </p>
          </div>
        }
        confirmLabel="I understand, run"
        destructive
        pending={mutation.isPending}
        onConfirm={() =>
          mutation.mutate(undefined, { onSettled: () => setOpen(false) })
        }
      />
    </Panel>
  );
}
