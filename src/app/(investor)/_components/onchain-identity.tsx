"use client";

import { RefreshCw } from "lucide-react";
import { HashValue } from "@/components/app/hash-value";
import { KeyValueList } from "@/components/app/key-value";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useMyKycOnChain } from "@/lib/api/hooks";

/**
 * Live verdict of the shared identity registry, which the token contract
 * checks on every transfer. It can differ from the compliance decision while
 * the on-chain registration is in progress.
 */
export function OnChainIdentityPanel({
  title = "On-chain identity",
  poll = false,
}: {
  title?: string;
  /** Re-reads the registry every 5 s, while a registration is expected. */
  poll?: boolean;
}) {
  const status = useMyKycOnChain(poll ? 5000 : false);
  const data = status.data;

  return (
    <Panel>
      <PanelHeader
        title={title}
        description="As read from the ERC-3643 identity registry"
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => status.refetch()}
            disabled={status.isFetching}
            aria-label="Refresh on-chain status"
          >
            <RefreshCw
              className={
                status.isFetching
                  ? "animate-spin motion-reduce:animate-none"
                  : ""
              }
            />
          </Button>
        }
      />
      <PanelBody className="py-2">
        {status.isLoading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : status.isError ? (
          <p className="py-3 text-sm text-muted-foreground" role="alert">
            Registry unavailable: {errorMessage(status.error)}
          </p>
        ) : data ? (
          <KeyValueList
            items={[
              {
                label: "Registry status",
                value: data.is_verified ? (
                  <StatusBadge tone="success">Verified on-chain</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Not registered</StatusBadge>
                ),
              },
              {
                label: "Wallet",
                value: data.wallet_address ? (
                  <HashValue value={data.wallet_address} />
                ) : (
                  <span className="text-muted-foreground">
                    Created at approval
                  </span>
                ),
              },
            ]}
          />
        ) : null}
      </PanelBody>
    </Panel>
  );
}
