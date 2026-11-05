"use client";

import { AlertTriangle, FileCheck2, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { StatusBadge } from "@/components/app/status-badge";
import { KycFileStatusBadge } from "@/components/app/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKyc, useKycList } from "@/lib/api/hooks";
import type { KycVerification } from "@/lib/api/types";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import {
  filterKycFiles,
  isKycExpired,
  KYC_TABS,
  type KycTab,
  kycTabCounts,
  needsOnChainSync,
  sortKycFiles,
} from "@/lib/kyc-review";
import { countryName } from "@/lib/reference";
import { cn } from "@/lib/utils";

export default function CompliancePage() {
  // The list filter only supports submitted/approved: load everything once and
  // split it client-side so every tab shares a single request.
  const list = useKycList({});
  const [chosenTab, setTab] = useState<KycTab | null>(null);
  const [query, setQuery] = useState("");

  const files = useMemo(() => list.data ?? [], [list.data]);
  const counts = useMemo(() => kycTabCounts(files), [files]);
  const tab: KycTab = chosenTab ?? (counts.submitted > 0 ? "submitted" : "all");
  const rows = useMemo(
    () => sortKycFiles(filterKycFiles(files, { tab, query }), tab),
    [files, tab, query],
  );

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="KYC reviews"
        description="Review investor identity files, decide on them and register approved investors in the on-chain identity registry."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "KYC reviews" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => list.refetch()}
            disabled={list.isFetching}
          >
            <RefreshCw className={cn(list.isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:px-5 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as KycTab)}
            className="-mx-1 overflow-x-auto px-1"
          >
            <TabsList aria-label="File status">
              {KYC_TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                  {t.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] tabular",
                      t.key === "submitted" && counts.submitted > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-background/70 text-muted-foreground",
                    )}
                  >
                    {counts[t.key]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full lg:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, e-mail, country…"
              aria-label="Search KYC files"
              className="pl-8"
            />
          </div>
        </div>

        {list.isPending ? (
          <TableSkeleton rows={4} cols={6} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title={
              query
                ? "No matching files"
                : tab === "submitted"
                  ? "Review queue is empty"
                  : "No files here"
            }
            description={
              query
                ? "Try another name, e-mail or country."
                : "New submissions from investors appear here."
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/admin/compliance/${f.id}`}
                    className="block space-y-1.5 px-4 py-3.5 transition hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-ink">
                        {f.declared_full_name}
                      </span>
                      <StatusCell file={f} />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {f.email} · {countryName(f.declared_country_code)}
                    </div>
                    <div className="text-xs text-muted-foreground tabular">
                      Submitted {formatDateTime(f.submitted_at ?? f.created_at)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <KycTable rows={rows} />
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

function KycTable({ rows }: { rows: KycVerification[] }) {
  const router = useRouter();
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5">Investor</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Decided</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="pr-5">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((f) => {
          const expired = f.status === "approved" && isKycExpired(f);
          return (
            <TableRow
              key={f.id}
              className="cursor-pointer"
              onClick={() => router.push(`/admin/compliance/${f.id}`)}
            >
              <TableCell className="max-w-64 pl-5">
                <Link
                  href={`/admin/compliance/${f.id}`}
                  className="block truncate text-sm font-medium text-ink underline-offset-4 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {f.declared_full_name}
                </Link>
                <div className="truncate text-xs text-muted-foreground">
                  {f.email} · User #{f.user_id}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {countryName(f.declared_country_code)}
                <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                  {f.declared_country_code}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs tabular">
                <div>{formatDateTime(f.submitted_at ?? f.created_at)}</div>
                {f.status === "submitted" ? (
                  <div className="text-muted-foreground">
                    {formatRelative(f.submitted_at ?? f.created_at)}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular">
                {formatDateTime(f.revoked_at ?? f.decided_at)}
              </TableCell>
              <TableCell
                className={cn(
                  "whitespace-nowrap text-xs tabular",
                  expired ? "text-red-600" : "text-muted-foreground",
                )}
              >
                {formatDate(f.expires_at)}
                {expired ? <div>Expired</div> : null}
              </TableCell>
              <TableCell className="pr-5">
                <StatusCell file={f} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function StatusCell({ file }: { file: KycVerification }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <KycFileStatusBadge status={file.status} />
      {file.status === "approved" ? <OnChainFlag id={file.id} /> : null}
    </span>
  );
}

/** The list omits the user's on-chain status, so approved files look it up individually. */
function OnChainFlag({ id }: { id: number }) {
  const detail = useKyc(id);
  if (!detail.data) return null;
  const pending = needsOnChainSync(detail.data);
  if (pending) {
    return (
      <StatusBadge tone="warning">
        <AlertTriangle className="size-3" aria-hidden /> Sync on-chain
      </StatusBadge>
    );
  }
  if (detail.data.kyc_status === "verified") {
    return <StatusBadge tone="info">On-chain</StatusBadge>;
  }
  return null;
}
