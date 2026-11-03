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
import type { ContractDetails } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const SUITE_CONTRACTS = [
  ["identityRegistry", "Identity registry"],
  ["identityRegistryStorage", "Identity registry storage"],
  ["trustedIssuersRegistry", "Trusted issuers registry"],
  ["claimTopicsRegistry", "Claim topics registry"],
  ["modularCompliance", "Modular compliance"],
  ["trexFactory", "T-REX factory"],
] as const;

export function TrexSuiteLookup() {
  const [draft, setDraft] = useState("");
  const [salt, setSalt] = useState<string | undefined>(undefined);
  const suite = useTrexSuite(salt);
  const data = suite.data;

  const contracts = SUITE_CONTRACTS.flatMap(([key, label]) => {
    const c = data?.[key] as ContractDetails | undefined;
    return c?.address ? [{ label, contract: c }] : [];
  });
  const token = data?.token as
    | { address?: string; name?: string; symbol?: string }
    | undefined;

  return (
    <Panel>
      <PanelHeader
        title="T-REX suite lookup"
        description="Contracts of a deployed ERC-3643 suite, by deployment salt."
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => suite.refetch()}
            disabled={suite.isFetching}
            aria-label="Refresh suite information"
          >
            <RefreshCw className={cn(suite.isFetching && "animate-spin")} />
          </Button>
        }
      />
      <PanelBody className="space-y-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setSalt(draft.trim() || undefined);
          }}
        >
          <FormField
            label="Deployment salt"
            htmlFor="trex-salt"
            hint="Leave empty for the platform default suite."
            className="flex-1"
          >
            <Input
              id="trex-salt"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. tooken-platform"
              className="font-mono"
            />
          </FormField>
          <Button type="submit" variant="outline" className="sm:mb-5">
            <Search /> Look up
          </Button>
        </form>

        {suite.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : suite.isError ? (
          <ErrorState
            error={suite.error}
            title="Suite not found"
            className="py-6"
          />
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {salt ? (
                  <>
                    Salt <span className="font-mono text-ink">{salt}</span> ·{" "}
                  </>
                ) : (
                  "Default suite · "
                )}
              </span>
              {data?.message ?? "Response received."}
            </div>
            {contracts.length || token?.address ? (
              <dl className="divide-y divide-dashed divide-border">
                {token?.address ? (
                  <Row
                    label={`Token${token.symbol ? ` (${token.symbol})` : ""}`}
                  >
                    <HashValue value={token.address} />
                  </Row>
                ) : null}
                {contracts.map(({ label, contract }) => (
                  <Row key={label} label={label}>
                    <HashValue value={contract.address} />
                    {contract.explorerUrl ? (
                      <a
                        href={contract.explorerUrl}
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
                On-chain contract details are not exposed by this backend
                version yet.
              </p>
            )}
          </div>
        )}
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
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center">{children}</dd>
    </div>
  );
}
