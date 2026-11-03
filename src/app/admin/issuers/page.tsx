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

export default function IssuersPage() {
  const router = useRouter();
  const issuers = useIssuers();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (issuers.data ?? [])
      .filter(
        (i) =>
          !q ||
          [
            i.name,
            i.legal_form,
            i.registration_number,
            i.lei_code,
            countryName(i.country_code),
          ]
            .filter(Boolean)
            .some((s) => String(s).toLowerCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [issuers.data, query]);

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
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <p className="text-sm text-muted-foreground tabular">
            {issuers.data
              ? `${issuers.data.length} issuer${issuers.data.length === 1 ? "" : "s"}`
              : "\u00a0"}
          </p>
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search name, RCS, LEI…"
              aria-label="Search issuers"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
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
                ? "Try another search term."
                : "Register the legal vehicle before creating its assets."
            }
            action={
              issuers.data?.length ? null : (
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
                          className="font-medium text-ink hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {i.name}
                        </Link>
                        {i.lei_code ? (
                          <p className="font-mono text-[11px] text-muted-foreground">
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
                        {i.real_estate_count ?? 0}
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
                      <p className="font-medium text-ink">{i.name}</p>
                      <IssuerStatusBadge status={i.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {i.legal_form} · {countryName(i.country_code)}
                      {i.registration_number
                        ? ` · ${i.registration_number}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground tabular">
                      {i.real_estate_count ?? 0} asset
                      {i.real_estate_count === 1 ? "" : "s"} · created{" "}
                      {formatDate(i.created_at)}
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
