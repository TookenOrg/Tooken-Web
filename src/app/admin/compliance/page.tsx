"use client";

import { FileCheck2, Info, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { StatusBadge } from "@/components/app/status-badge";
import { KycFileStatusBadge } from "@/components/app/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useKycList } from "@/lib/api/hooks";
import type { KycVerification } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import {
  filterKycFiles,
  isKycExpired,
  KYC_TABS,
  type KycTab,
  kycTabCounts,
  sortKycFiles,
} from "@/lib/kyc-review";
import { countryName } from "@/lib/reference";
import { cn } from "@/lib/utils";

function submissionAge(file: KycVerification) {
  const submitted = file.submitted_at ? Date.parse(file.submitted_at) : NaN;
  if (!Number.isFinite(submitted)) return "Submission date unavailable";
  if (submitted > Date.now()) return "Submission date is in the future";
  return `Submitted ${formatRelative(file.submitted_at)}`;
}

export default function CompliancePage() {
  const { isAdmin, userLoading } = useSession();
  const list = useKycList({}, isAdmin);
  const [chosenTab, setTab] = useState<KycTab | null>(null);
  const [query, setQuery] = useState("");

  const files = useMemo(() => list.data ?? [], [list.data]);
  const counts = useMemo(() => kycTabCounts(files), [files]);
  const tab: KycTab = chosenTab ?? (counts.submitted > 0 ? "submitted" : "all");
  const rows = useMemo(
    () => sortKycFiles(filterKycFiles(files, { tab, query }), tab),
    [files, tab, query],
  );
  const countsAvailable = !list.isPending && !list.isError && !!list.data;

  if (!isAdmin && !userLoading) {
    return (
      <Panel>
        <EmptyState
          title="Administrator access required"
          description="KYC files are available to administrators only."
        />
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="KYC reviews"
        description="Review identity files and their compliance decisions."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "KYC reviews" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void list.refetch()}
            disabled={list.isFetching}
          >
            <RefreshCw
              className={cn(
                list.isFetching && "animate-spin motion-reduce:animate-none",
              )}
            />
            {list.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      <div className="space-y-6">
        <Alert>
          <Info />
          <AlertTitle>
            Registration status is not available in this list
          </AlertTitle>
          <AlertDescription>
            Open an approved file to review its account status. A reliable
            registration-pending queue requires registry verdicts in the list
            from the service; approval alone does not confirm registration.
          </AlertDescription>
        </Alert>
        <Panel>
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as KycTab)}
                className="-mx-1 overflow-x-auto px-1"
              >
                <TabsList aria-label="File status">
                  {KYC_TABS.map((item) => (
                    <TabsTrigger
                      key={item.key}
                      value={item.key}
                      className="gap-1.5"
                    >
                      {item.label}
                      {countsAvailable ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 text-[11px] tabular",
                            item.key === "submitted" && counts.submitted > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-background/70 text-muted-foreground",
                          )}
                        >
                          {counts[item.key]}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <p className="mt-1 text-xs text-muted-foreground lg:hidden">
                Status filters scroll horizontally.
              </p>
            </div>
            <div className="relative w-full lg:w-72">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, e-mail, country…"
                aria-label="Search KYC files"
                className="pl-8"
              />
            </div>
          </div>

          {userLoading || list.isPending ? (
            <TableSkeleton rows={4} cols={5} />
          ) : list.isError ? (
            <ErrorState
              error={list.error}
              onRetry={() => void list.refetch()}
            />
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
                  ? "Try another name, e-mail, country or id."
                  : "No files with this status were returned."
              }
              action={
                query ? (
                  <Button variant="outline" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {rows.map((file) => (
                  <li key={file.id}>
                    <Link
                      href={`/admin/compliance/${file.id}`}
                      prefetch={false}
                      className="block space-y-1.5 px-4 py-3.5 transition hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline focus-visible:outline-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span className="min-w-0 max-w-full break-all text-sm font-medium text-ink">
                          {file.declared_full_name}
                        </span>
                        <StatusCell file={file} />
                      </div>
                      <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        {file.email} · {countryName(file.declared_country_code)}{" "}
                        · User #{file.user_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {submissionAge(file)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <p className="px-5 pt-3 text-xs text-muted-foreground">
                  The table can scroll horizontally.
                </p>
                <KycTable rows={rows} />
              </div>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

function KycTable({ rows }: { rows: KycVerification[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5">Investor</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Submission</TableHead>
          <TableHead>Valid until</TableHead>
          <TableHead className="pr-5">File status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((file) => (
          <TableRow key={file.id}>
            <TableCell className="max-w-64 pl-5">
              <Link
                href={`/admin/compliance/${file.id}`}
                prefetch={false}
                className="block break-words text-sm font-medium text-ink underline-offset-4 hover:underline [overflow-wrap:anywhere]"
              >
                {file.declared_full_name}
              </Link>
              <div className="break-all text-xs text-muted-foreground">
                {file.email} · User #{file.user_id}
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {countryName(file.declared_country_code)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs tabular">
              <div>{submissionAge(file)}</div>
              {file.submitted_at &&
              Number.isFinite(Date.parse(file.submitted_at)) ? (
                <div className="text-muted-foreground">
                  {formatDateTime(file.submitted_at)}
                </div>
              ) : null}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular">
              {formatDate(file.expires_at)}
            </TableCell>
            <TableCell className="pr-5">
              <StatusCell file={file} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusCell({ file }: { file: KycVerification }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <KycFileStatusBadge status={file.status} />
      {file.status === "approved" && isKycExpired(file) ? (
        <StatusBadge tone="warning">Approval expired</StatusBadge>
      ) : null}
      {file.status === "approved" ? (
        <span className="text-xs text-muted-foreground">
          Registry verdict unavailable
        </span>
      ) : null}
    </span>
  );
}
