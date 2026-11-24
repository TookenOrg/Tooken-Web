"use client";

import { Landmark, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { IssuerStatusBadge } from "@/components/app/status-badges";
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
import { useIssuers } from "@/lib/api/hooks";
import { formatDate } from "@/lib/format";
import { countryName } from "@/lib/reference";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "suspended", label: "Suspended" },
  { id: "dissolved", label: "Dissolved" },
  { id: "other", label: "Other" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

function matchesStatus(status: string, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "other") {
    return !["active", "draft", "suspended", "dissolved"].includes(status);
  }
  return status === filter;
}

export default function IssuersPage() {
  const router = useRouter();
  const issuers = useIssuers();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: 0,
      active: 0,
      draft: 0,
      suspended: 0,
      dissolved: 0,
      other: 0,
    };
    for (const issuer of issuers.data ?? []) {
      for (const option of FILTERS) {
        if (matchesStatus(issuer.status, option.id)) result[option.id]++;
      }
    }
    return result;
  }, [issuers.data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (issuers.data ?? [])
      .filter((i) => matchesStatus(i.status, filter))
      .filter(
        (i) =>
          !q ||
          [
            i.name,
            i.legal_form,
            i.registration_number,
            i.lei_code,
            i.country_code,
            countryName(i.country_code),
          ]
            .filter(Boolean)
            .some((s) => String(s).toLowerCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [issuers.data, query, filter]);

  return (
    <>
      <PageHeader
        title="Issuers"
        description="Legal vehicles (SPVs, funds, compartments) issuing the tokenized shares."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Issuers" },
        ]}
        actions={
          <Button
            asChild
            className="bg-brand text-brand-foreground hover:bg-brand-light"
          >
            <Link href="/admin/issuers/new">
              <Plus /> New issuer
            </Link>
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between md:px-5">
          <fieldset
            aria-label="Filter issuers by status"
            className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1"
          >
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === option.id
                    ? "bg-ink text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-ink",
                )}
              >
                {option.label}{" "}
                <span
                  className={cn(
                    "rounded px-1.5 text-[11px] tabular",
                    filter === option.id ? "bg-white/15" : "bg-muted",
                  )}
                >
                  {issuers.isSuccess ? counts[option.id] : "—"}
                </span>
              </button>
            ))}
          </fieldset>
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search name, registration, LEI, country…"
              aria-label="Search issuers"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-5">
          <p
            className="text-sm text-muted-foreground tabular"
            aria-live="polite"
          >
            {issuers.isSuccess
              ? filter !== "all" || query.trim()
                ? `${rows.length} of ${issuers.data?.length ?? 0} issuers`
                : `${rows.length} issuer${rows.length === 1 ? "" : "s"}`
              : "Issuer count unavailable"}
          </p>
          {(filter !== "all" || query.trim()) && rows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
            >
              Reset filters
            </Button>
          ) : null}
        </div>

        {issuers.isLoading ? (
          <TableSkeleton rows={3} cols={6} />
        ) : issuers.isError ? (
          <ErrorState error={issuers.error} onRetry={() => issuers.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={
              issuers.data?.length ? "No matching issuer" : "No issuer yet"
            }
            description={
              issuers.data?.length
                ? "Try another status or search term."
                : "Register the legal vehicle before creating its assets."
            }
            action={
              issuers.data?.length ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                  }}
                >
                  Reset filters
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link href="/admin/issuers/new">
                    <Plus /> New issuer
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Name</TableHead>
                    <TableHead>Legal form</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Registration no.</TableHead>
                    <TableHead className="text-right">Assets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-5">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((i) => (
                    <TableRow
                      key={i.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/issuers/${i.id}`)}
                    >
                      <TableCell className="pl-5">
                        <Link
                          href={`/admin/issuers/${i.id}`}
                          className="break-words font-medium text-ink hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {i.name}
                        </Link>
                        {i.lei_code ? (
                          <p className="break-all font-mono text-[11px] text-muted-foreground">
                            LEI {i.lei_code}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>{i.legal_form}</TableCell>
                      <TableCell>{countryName(i.country_code)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {i.registration_number || (
                          <span className="font-sans text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {i.real_estate_count ?? "—"}
                      </TableCell>
                      <TableCell>
                        <IssuerStatusBadge status={i.status} />
                      </TableCell>
                      <TableCell className="pr-5 text-sm text-muted-foreground">
                        {formatDate(i.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/admin/issuers/${i.id}`}
                    className="block space-y-1.5 px-4 py-4 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words font-medium text-ink">
                        {i.name}
                      </p>
                      <IssuerStatusBadge status={i.status} />
                    </div>
                    <p className="break-words text-xs text-muted-foreground">
                      {i.legal_form} · {countryName(i.country_code)}
                      {i.registration_number
                        ? ` · ${i.registration_number}`
                        : ""}
                    </p>
                    {i.lei_code ? (
                      <p className="break-all font-mono text-xs text-muted-foreground">
                        LEI {i.lei_code}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground tabular">
                      {typeof i.real_estate_count !== "number"
                        ? "Asset count unavailable"
                        : `${i.real_estate_count} asset${i.real_estate_count === 1 ? "" : "s"}`}{" "}
                      · created {formatDate(i.created_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}
