"use client";

import { Info, Search, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormField } from "@/components/app/form-field";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { StatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { errorMessage } from "@/lib/api/client";
import { useKycList, useUpdateUserRole } from "@/lib/api/hooks";
import type { Role as MaybeRole, User } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import { investorDirectory } from "@/lib/order-book";
import { countryName } from "@/lib/reference";
import type { Tone } from "@/lib/status";

type Role = NonNullable<MaybeRole>;

const ROLES: { value: Role; label: string; tone: Tone; hint: string }[] = [
  {
    value: "USER",
    label: "Investor",
    tone: "neutral",
    hint: "Marketplace, subscriptions and own portfolio.",
  },
  {
    value: "MANAGER",
    label: "Manager",
    tone: "info",
    hint: "Back office: issuers, assets and order book.",
  },
  {
    value: "ADMIN",
    label: "Administrator",
    tone: "warning",
    hint: "Full access, including compliance, platform and roles.",
  },
];

const roleMeta = (role: MaybeRole) =>
  ROLES.find((r) => r.value === role) ?? ROLES[0];

function RoleBadge({ role }: { role: MaybeRole }) {
  const meta = roleMeta(role);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export default function UsersPage() {
  const { user: me } = useSession();
  const kyc = useKycList({});
  const update = useUpdateUserRole();
  const directory = useMemo(
    () =>
      [...investorDirectory(kyc.data).values()].sort((a, b) =>
        (a.fullName ?? "").localeCompare(b.fullName ?? ""),
      ),
    [kyc.data],
  );

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("MANAGER");
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(false);
  // The API does not list roles: show the ones changed from this page.
  const [changed, setChanged] = useState<Map<number, User>>(new Map());

  const id = Number.parseInt(userId, 10);
  const validId = Number.isInteger(id) && id > 0;
  const isSelf = validId && id === me?.id;
  const target = validId ? directory.find((d) => d.userId === id) : undefined;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter((d) =>
      [d.fullName, d.email, String(d.userId)]
        .filter(Boolean)
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [directory, query]);

  const pick = (uid: number) => {
    setUserId(String(uid));
    update.reset();
    document
      .getElementById("role-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const apply = () => {
    update.mutate(
      { userId: id, role },
      {
        onSuccess: (u) => {
          setConfirming(false);
          setChanged((m) => new Map(m).set(u.id, u));
          toast.success("Role updated", {
            description: `${u.full_name || u.email} is now ${roleMeta(u.role).label.toLowerCase()}.`,
          });
        },
        onError: () => setConfirming(false),
      },
    );
  };

  const last = update.data;

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Access & roles"
        description="Grant or withdraw back-office access. The platform re-checks the administrator list on every change."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Access & roles" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Investor directory
              </h2>
              <p className="text-xs text-muted-foreground">
                Accounts known from identity filings
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, e-mail, id…"
                aria-label="Search accounts"
                className="pl-8"
              />
            </div>
          </div>
          {kyc.isPending ? (
            <TableSkeleton rows={4} cols={4} />
          ) : kyc.isError ? (
            <ErrorState error={kyc.error} onRetry={() => kyc.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title={query ? "No matching account" : "No investor yet"}
              description="Accounts appear here once they have filed an identity verification. Any account can still be changed by its id."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Id</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Residence
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => {
                  const updated = changed.get(d.userId);
                  return (
                    <TableRow key={d.userId}>
                      <TableCell className="text-muted-foreground tabular">
                        #{d.userId}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-ink">
                          {d.fullName || "—"}
                        </div>
                        <div className="break-all text-xs text-muted-foreground">
                          {d.email ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {d.countryCode ? countryName(d.countryCode) : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {updated ? (
                          <RoleBadge role={updated.role} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Unchanged
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pick(d.userId)}
                        >
                          Change role
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel id="role-form" className="scroll-mt-20">
            <PanelHeader
              title="Change a role"
              description="Administrators only"
            />
            <PanelBody className="space-y-4">
              <FormField
                label="Account id"
                htmlFor="role-user-id"
                required
                error={
                  userId && !validId
                    ? "Enter a positive account id."
                    : isSelf
                      ? "You cannot change your own role."
                      : undefined
                }
                hint={
                  target
                    ? [target.fullName, target.email]
                        .filter(Boolean)
                        .join(" · ")
                    : "Pick an account in the directory or type its id."
                }
              >
                <Input
                  id="role-user-id"
                  inputMode="numeric"
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value.replace(/[^\d]/g, ""));
                    update.reset();
                  }}
                  placeholder="42"
                  className="tabular"
                />
              </FormField>
              <FormField
                label="New role"
                htmlFor="role-value"
                required
                hint={roleMeta(role).hint}
              >
                <Select
                  value={role}
                  onValueChange={(v) => {
                    setRole(v as Role);
                    update.reset();
                  }}
                >
                  <SelectTrigger id="role-value" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {update.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>The role was not changed</AlertTitle>
                  <AlertDescription>
                    {errorMessage(update.error)}
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button
                className="w-full bg-brand text-brand-foreground hover:bg-brand-light"
                disabled={!validId || isSelf || update.isPending}
                onClick={() => setConfirming(true)}
              >
                <UserCog /> Apply role
              </Button>
            </PanelBody>
          </Panel>

          {last ? (
            <Panel>
              <PanelHeader title="Last change" />
              <PanelBody className="py-2">
                <KeyValueList
                  items={[
                    { label: "Account", value: `#${last.id}` },
                    { label: "Name", value: last.full_name || "—" },
                    { label: "E-mail", value: last.email ?? "—" },
                    { label: "Role", value: <RoleBadge role={last.role} /> },
                  ]}
                />
              </PanelBody>
            </Panel>
          ) : null}

          <Alert>
            <Info />
            <AlertTitle>When does it apply?</AlertTitle>
            <AlertDescription>
              The account receives its new rights at its next session refresh or
              sign-in. You cannot demote yourself, nor the last administrator.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Change this account's role?"
        description={
          <p>
            Account <strong className="tabular">#{validId ? id : "—"}</strong>
            {target?.fullName ? ` (${target.fullName})` : ""} will become{" "}
            <strong>{roleMeta(role).label.toLowerCase()}</strong>.
          </p>
        }
        confirmLabel="Change role"
        destructive={role === "USER"}
        pending={update.isPending}
        onConfirm={apply}
      />
    </>
  );
}
