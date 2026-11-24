"use client";

import { Info, RefreshCw, Search, UserCog } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/app/form-field";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { StatusBadge } from "@/components/app/status-badge";
import { TookenLoader } from "@/components/app/tooken-loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/api/client";
import { useKycList, useUpdateUserRole } from "@/lib/api/hooks";
import type { Role as MaybeRole, User } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import { investorDirectory } from "@/lib/order-book";
import { countryName } from "@/lib/reference";
import type { Tone } from "@/lib/status";

type Role = NonNullable<MaybeRole>;
type RoleChange = {
  id: number;
  name: string | null;
  email: string | null;
  currentRole: Role | null;
  newRole: Role;
};

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

const roleMeta = (role: string | null | undefined) =>
  ROLES.find((item) => item.value === role);

function RoleBadge({ role }: { role: string | null | undefined }) {
  const meta = roleMeta(role);
  return (
    <StatusBadge tone={meta?.tone ?? "neutral"}>
      {meta?.label ?? "Current role unavailable"}
    </StatusBadge>
  );
}

function sameChange(a: RoleChange, b: RoleChange | null) {
  return (
    b !== null &&
    a.id === b.id &&
    a.name === b.name &&
    a.email === b.email &&
    a.currentRole === b.currentRole &&
    a.newRole === b.newRole
  );
}

export default function UsersPage() {
  const { user: me, claims, isAdmin, userLoading } = useSession();
  const kyc = useKycList({}, isAdmin);
  const update = useUpdateUserRole();
  const directory = useMemo(
    () =>
      [...investorDirectory(kyc.isError ? undefined : kyc.data).values()].sort(
        (a, b) =>
          (a.fullName ?? "").localeCompare(b.fullName ?? "") ||
          (a.email ?? "").localeCompare(b.email ?? "") ||
          a.userId - b.userId,
      ),
    [kyc.data, kyc.isError],
  );
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("MANAGER");
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<RoleChange | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [unconfirmedId, setUnconfirmedId] = useState<number | null>(null);
  const [last, setLast] = useState<User | null>(null);
  const [changed, setChanged] = useState<
    Map<number, { user: User; dataUpdatedAt: number }>
  >(new Map());
  const actionLock = useRef(false);

  const parsedId = /^\d+$/.test(userId) ? Number(userId) : NaN;
  const validId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const selfId = me?.id ?? claims?.userId;
  const selfKnown = Number.isSafeInteger(selfId) && (selfId ?? 0) > 0;
  const isSelf = validId && selfKnown && parsedId === selfId;
  const target = validId
    ? directory.find((account) => account.userId === parsedId)
    : undefined;
  const currentRoleFor = (id: number, fallback: MaybeRole) => {
    const change = changed.get(id);
    return change && change.dataUpdatedAt === kyc.dataUpdatedAt
      ? change.user.role
      : fallback;
  };
  const roleValue = target
    ? currentRoleFor(target.userId, target.role)
    : undefined;
  const currentRole = roleMeta(roleValue)?.value ?? null;
  const sameRole = currentRole === role;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter((account) =>
      [account.fullName, account.email, String(account.userId)]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(q)),
    );
  }, [directory, query]);

  const selection: RoleChange | null = validId
    ? {
        id: parsedId,
        name: target?.fullName ?? null,
        email: target?.email ?? null,
        currentRole,
        newRole: role,
      }
    : null;
  const selectionChanged = review !== null && !sameChange(review, selection);
  const reviewBlock = !validId
    ? "Select an account or enter a valid account ID."
    : !selfKnown
      ? "Your own account ID is unavailable; refresh your session first."
      : isSelf
        ? "You cannot change your own role."
        : kyc.isPending || kyc.isFetching
          ? "Wait for account information to finish loading."
          : unconfirmedId === parsedId
            ? "Refresh the account list before another change."
            : sameRole
              ? "Choose a different role from the current role."
              : update.isPending
                ? "The role change is being submitted."
                : null;

  const pick = (id: number) => {
    setUserId(String(id));
    setReviewError(null);
    update.reset();
    document.getElementById("role-form")?.focus();
  };
  const refreshDirectory = async () => {
    const result = await kyc.refetch();
    if (!result.isError && result.data) setUnconfirmedId(null);
  };
  const apply = () => {
    if (
      !review ||
      selectionChanged ||
      reviewBlock ||
      !isAdmin ||
      update.isPending ||
      actionLock.current
    )
      return;
    actionLock.current = true;
    setReviewError(null);
    update.mutate(
      { userId: review.id, role: review.newRole },
      {
        onSuccess: (account) => {
          if (account.id !== review.id || account.role !== review.newRole) {
            setUnconfirmedId(review.id);
            setReviewError(
              "The response did not confirm this account and role. Close this dialog and refresh the list before trying again.",
            );
            return;
          }
          setReview(null);
          setLast(account);
          setChanged((previous) =>
            new Map(previous).set(account.id, {
              user: account,
              dataUpdatedAt: kyc.dataUpdatedAt,
            }),
          );
          toast.success("Role updated", {
            description: `${account.full_name || account.email} is now ${roleMeta(account.role)?.label.toLowerCase()}.`,
          });
        },
        onError: (error) => setReviewError(errorMessage(error)),
        onSettled: () => {
          actionLock.current = false;
        },
      },
    );
  };

  if (!isAdmin && !userLoading) {
    return (
      <Panel>
        <EmptyState
          title="Administrator access required"
          description="Role changes are available to administrators only."
        />
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Access & roles"
        description="Review the account identity and its permissions before changing a role."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Access & roles" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Accounts with identity filings
              </h2>
              <p className="text-xs text-muted-foreground">
                This list is not a complete account directory.
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or e-mail…"
                aria-label="Search accounts with identity filings"
                className="pl-8"
              />
            </div>
          </div>
          {userLoading || kyc.isPending ? (
            <TableSkeleton rows={4} cols={3} />
          ) : kyc.isError ? (
            <ErrorState
              error={kyc.error}
              onRetry={() => void refreshDirectory()}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title={query ? "No matching account" : "No identity filings"}
              description="Only accounts with identity filings appear in this list."
              action={
                query ? (
                  <Button variant="outline" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                ) : null
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((account) => (
                <li
                  key={account.userId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-medium text-ink [overflow-wrap:anywhere]">
                      <span className="text-xs font-normal text-muted-foreground">
                        Declared name:{" "}
                      </span>
                      <span>{account.fullName || "Name unavailable"}</span>
                    </div>
                    <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      E-mail: {account.email || "Unavailable"} · Account #
                      {account.userId}
                      {account.countryCode
                        ? ` · ${countryName(account.countryCode)}`
                        : ""}
                    </div>
                    <div className="mt-1.5">
                      <RoleBadge
                        role={currentRoleFor(account.userId, account.role)}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => pick(account.userId)}
                    aria-label={`Select ${account.fullName || "account"}, ${account.email || "e-mail unavailable"}, account ${account.userId}`}
                  >
                    Select account
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="min-w-0 space-y-6">
          <Panel id="role-form" tabIndex={-1} className="scroll-mt-20">
            <PanelHeader
              title="Change a role"
              description="Administrators only"
            />
            <PanelBody className="space-y-4">
              {selection ? (
                <div className="space-y-2 rounded-md border border-border p-3 text-sm">
                  <h3 className="font-semibold text-ink">Selected account</h3>
                  <p className="break-words [overflow-wrap:anywhere]">
                    Declared name: {selection.name || "Unavailable"}
                    <br />
                    E-mail: {selection.email || "Unavailable"}
                    <br />
                    Account #{selection.id}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Current role:</span>{" "}
                    <RoleBadge role={selection.currentRole} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {roleMeta(selection.currentRole)?.hint ??
                      "Current permissions cannot be determined from this list."}
                  </p>
                  {!target ? (
                    <p className="text-xs text-amber-800">
                      Identity cannot be previewed for this ID. Verify it
                      independently.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select an account by name and e-mail from the list.
                </p>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-ink">
                  Use an account ID (advanced)
                </summary>
                <div className="mt-3">
                  <FormField label="Account ID" htmlFor="role-user-id">
                    <Input
                      id="role-user-id"
                      inputMode="numeric"
                      value={userId}
                      onChange={(event) => {
                        setUserId(event.target.value);
                        setReviewError(null);
                        update.reset();
                      }}
                      aria-invalid={!!userId && (!validId || isSelf)}
                      aria-describedby={
                        userId && (!validId || isSelf)
                          ? "role-id-error"
                          : "role-id-hint"
                      }
                      className="tabular"
                    />
                    {userId && (!validId || isSelf) ? (
                      <p
                        id="role-id-error"
                        className="text-xs text-red-600"
                        role="alert"
                      >
                        {isSelf
                          ? "You cannot change your own role."
                          : "Enter a positive account ID."}
                      </p>
                    ) : (
                      <p
                        id="role-id-hint"
                        className="text-xs text-muted-foreground"
                      >
                        Accounts outside this list cannot be previewed. Verify
                        the ID independently.
                      </p>
                    )}
                  </FormField>
                </div>
              </details>
              <FormField label="New role" htmlFor="role-value" required>
                <Select
                  value={role}
                  onValueChange={(value) => {
                    setRole(value as Role);
                    setReviewError(null);
                    update.reset();
                  }}
                >
                  <SelectTrigger
                    id="role-value"
                    className="w-full"
                    aria-describedby="role-new-hint"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p id="role-new-hint" className="text-xs text-muted-foreground">
                  {roleMeta(role)?.hint}
                </p>
              </FormField>
              {reviewBlock ? (
                <p
                  id="role-block-reason"
                  className="text-sm text-muted-foreground"
                >
                  {reviewBlock}
                </p>
              ) : null}
              <Button
                className="w-full bg-brand text-brand-foreground hover:bg-brand-light"
                disabled={!!reviewBlock}
                aria-describedby={reviewBlock ? "role-block-reason" : undefined}
                onClick={() => {
                  if (selection && !reviewBlock) {
                    setReviewError(null);
                    setReview(selection);
                  }
                }}
              >
                <UserCog /> Review role change
              </Button>
              {unconfirmedId === parsedId ? (
                <Button
                  variant="outline"
                  onClick={() => void refreshDirectory()}
                >
                  <RefreshCw /> Refresh account list
                </Button>
              ) : null}
            </PanelBody>
          </Panel>
          {last ? (
            <Panel>
              <PanelHeader title="Last confirmed change" />
              <PanelBody className="py-2">
                <KeyValueList
                  items={[
                    { label: "Account", value: `#${last.id}` },
                    {
                      label: "Name",
                      value: (
                        <span className="break-all">{last.full_name}</span>
                      ),
                    },
                    {
                      label: "E-mail",
                      value: <span className="break-all">{last.email}</span>,
                    },
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
              Existing tokens retain their previous role until they expire.
              Refreshing or signing in issues the current role. The server
              protects the last administrator; you cannot change your own role
              here.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <AlertDialog
        open={review !== null}
        onOpenChange={(open) => {
          if (!open && !update.isPending) setReview(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Change this account&apos;s role?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 break-words [overflow-wrap:anywhere]">
                <p>
                  Declared name: {review?.name || "Unavailable"}
                  <br />
                  E-mail: {review?.email || "Unavailable"}
                  <br />
                  Account #{review?.id}
                </p>
                <p>
                  Current role:{" "}
                  <strong>
                    {roleMeta(review?.currentRole)?.label ?? "Unavailable"}
                  </strong>
                  {" → "}
                  New role: <strong>{roleMeta(review?.newRole)?.label}</strong>
                </p>
                {!review?.name || !review?.email ? (
                  <p>
                    Identity cannot be previewed for this ID. Verify it
                    independently.
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectionChanged ? (
            <p role="alert" className="text-sm text-red-700">
              Account information changed. Cancel and review the current details
              again.
            </p>
          ) : null}
          {reviewError ? (
            <p role="alert" className="text-sm text-red-700">
              {reviewError}
            </p>
          ) : null}
          {update.isPending ? (
            <p className="text-sm">Submitting role change…</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant={review?.newRole === "USER" ? "destructive" : "default"}
              disabled={
                update.isPending ||
                selectionChanged ||
                (!!review && unconfirmedId === review.id)
              }
              onClick={apply}
            >
              {update.isPending ? <TookenLoader size={16} /> : null}
              Change role
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
