"use client";

import { RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { FormField } from "@/components/app/form-field";
import { HashValue } from "@/components/app/hash-value";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrexSuite } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { ResultPanel } from "./result-panel";

const SUITE_CONTRACTS = [
  ["identityRegistry", "Identity registry"],
  ["identityRegistryStorage", "Identity registry storage"],
  ["trustedIssuersRegistry", "Trusted issuers registry"],
  ["claimTopicsRegistry", "Claim topics registry"],
  ["modularCompliance", "Modular compliance"],
  ["trexFactory", "T-REX factory"],
] as const;

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function hasSuiteFields(value: Record<string, unknown> | undefined): boolean {
  return !!(
    value &&
    (record(value.token) || SUITE_CONTRACTS.some(([key]) => record(value[key])))
  );
}

export function TrexSuiteLookup() {
  const [draft, setDraft] = useState("");
  const [salt, setSalt] = useState<string | undefined>(undefined);
  const suite = useTrexSuite(salt);
  const root = record(suite.data);
  const nested = record(root?.data);
  const data = hasSuiteFields(root) ? root : (nested ?? root);

  const contracts = SUITE_CONTRACTS.flatMap(([key, label]) => {
    const contract = record(data?.[key]);
    const address = contract?.address;
    const explorerUrl = contract?.explorerUrl;
    return typeof address === "string" && address.trim()
      ? [
          {
            label,
            address,
            explorerUrl:
              typeof explorerUrl === "string" &&
              /^https?:\/\//i.test(explorerUrl)
                ? explorerUrl
                : undefined,
          },
        ]
      : [];
  });
  const token = record(data?.token);
  const tokenAddress =
    typeof token?.address === "string" && token.address.trim()
      ? token.address
      : undefined;
  const tokenSymbol =
    typeof token?.symbol === "string" && token.symbol.trim()
      ? token.symbol
      : undefined;

  return (
    <Panel>
      <PanelHeader
        title="T-REX suite lookup"
        description="Read available ERC-3643 suite information by deployment salt."
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => suite.refetch()}
            disabled={suite.isFetching}
            aria-label="Refresh suite information"
          >
            <RefreshCw
              className={cn(
                suite.isFetching && "animate-spin motion-reduce:animate-none",
              )}
            />
          </Button>
        }
      />
      <PanelBody className="space-y-4">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <strong className="font-medium text-ink">
              Network and environment: unknown.
            </strong>{" "}
            The suite lookup does not provide these fields.
          </p>
          <p>
            <strong className="font-medium text-ink">
              Initialisation status: unknown.
            </strong>{" "}
            This lookup does not establish platform health or whether all
            bootstrap steps have completed.
          </p>
        </div>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const requested = draft.trim() || undefined;
            if (requested === salt) {
              void suite.refetch();
            } else {
              setSalt(requested);
            }
          }}
        >
          <FormField
            label="Deployment salt"
            htmlFor="trex-salt"
            className="flex-1"
          >
            <Input
              id="trex-salt"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. tooken-platform"
              className="font-mono"
              aria-describedby="trex-salt-hint"
            />
            <p id="trex-salt-hint" className="text-xs text-muted-foreground">
              Leave empty for the platform default suite.
            </p>
          </FormField>
          <Button type="submit" variant="outline" className="sm:mb-5">
            <Search /> Look up
          </Button>
        </form>

        {suite.isPending ? (
          <div>
            <output className="sr-only">Loading suite information…</output>
            <Skeleton className="h-16 w-full" />
          </div>
        ) : suite.isError ? (
          <div className="space-y-2">
            <ErrorState
              error={suite.error}
              title="Suite information unavailable"
              onRetry={() => void suite.refetch()}
              className="py-6"
            />
            <p className="text-sm text-muted-foreground">
              A failed lookup does not establish whether the suite exists.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              {salt ? (
                <>
                  Requested salt{" "}
                  <span className="break-all font-mono text-ink">{salt}</span>
                </>
              ) : (
                "Platform default suite"
              )}
            </div>
            {contracts.length || tokenAddress ? (
              <dl className="divide-y divide-dashed divide-border">
                {tokenAddress ? (
                  <Row label={`Token${tokenSymbol ? ` (${tokenSymbol})` : ""}`}>
                    <HashValue value={tokenAddress} full />
                  </Row>
                ) : null}
                {contracts.map(({ label, address, explorerUrl }) => (
                  <Row key={label} label={label}>
                    <HashValue value={address} full />
                    {explorerUrl ? (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-xs underline-offset-4 hover:underline"
                      >
                        Explorer
                      </a>
                    ) : null}
                  </Row>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No contract addresses were returned. This does not establish
                whether the suite or platform has been initialised.
              </p>
            )}
          </div>
        )}
        <ResultPanel
          endpoint="GET /trex/suite"
          data={
            !suite.isPending && !suite.isError
              ? (suite.data ?? null)
              : undefined
          }
          status="Suite response received; network and initialisation status remain unknown."
          title="Suite response"
        />
      </PanelBody>
    </Panel>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-1">{children}</dd>
    </div>
  );
}
