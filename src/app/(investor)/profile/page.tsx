"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { ErrorState, PageSkeleton } from "@/components/app/states";
import { roleLabel, UserAvatar } from "@/components/app/user-menu";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session-context";
import { formatDate, formatDateTime } from "@/lib/format";
import { countryName } from "@/lib/reference";
import {
  useInvestorVerification,
  VerificationSummary,
} from "../verification/verification-summary";

export default function ProfilePage() {
  const { user, userLoading, isInvestor, isStaff, role, refreshUser } =
    useSession();
  if (userLoading) return <PageSkeleton />;
  if (!user) {
    return (
      <>
        <PageHeader title="Profile" />
        <Panel>
          <ErrorState
            error={new Error("Account details are unavailable.")}
            onRetry={() => void refreshUser()}
          />
        </Panel>
      </>
    );
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const displayRole = role ? roleLabel(role) : "Role unavailable";

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          {
            label: isStaff ? "Back office" : "Dashboard",
            href: isStaff ? "/admin" : "/dashboard",
          },
          { label: "Profile" },
        ]}
        title="Profile"
        description="Your account and workspace information."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Panel>
            <PanelBody className="flex items-center gap-4">
              <UserAvatar name={user.full_name} className="size-14 text-base" />
              <div className="min-w-0">
                <div className="break-words text-lg font-semibold text-ink [overflow-wrap:anywhere]">
                  {user.full_name}
                </div>
                <div className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {user.email} · {displayRole}
                </div>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Account"
              description="Your name and e-mail are read-only here."
            />
            <PanelBody>
              <KeyValueList
                columns={2}
                items={[
                  {
                    label: "Full name",
                    value: <span className="break-all">{user.full_name}</span>,
                  },
                  {
                    label: "E-mail",
                    value: <span className="break-all">{user.email}</span>,
                  },
                  { label: "Role", value: displayRole },
                  { label: "Client ID", value: `#${user.id}`, mono: true },
                  { label: "Member since", value: formatDate(user.created_at) },
                  {
                    label: "Last sign-in",
                    value: formatDateTime(user.last_connexion),
                  },
                  ...(isInvestor
                    ? [
                        {
                          label: "Country",
                          value: user.country_code
                            ? countryName(user.country_code)
                            : "Unavailable",
                        },
                      ]
                    : []),
                ]}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Workspace information"
              description="Display formats used in this workspace."
            />
            <PanelBody>
              <KeyValueList
                columns={2}
                items={[
                  { label: "Language", value: "English (UK)" },
                  { label: "Number format", value: "1,234.56" },
                  {
                    label: "Browser time zone",
                    value: timeZone || "Unavailable",
                  },
                ]}
              />
            </PanelBody>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          {isInvestor ? (
            <InvestorProfileSummary user={user} refreshUser={refreshUser} />
          ) : null}
          <Panel>
            <PanelHeader title="Security" />
            <PanelBody className="space-y-4">
              <KeyValueList
                items={[
                  { label: "Authentication", value: "E-mail and password" },
                ]}
              />
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/logout">
                  <LogOut /> Sign out
                </Link>
              </Button>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function InvestorProfileSummary({
  user,
  refreshUser,
}: {
  user: User;
  refreshUser: () => Promise<unknown>;
}) {
  const inProgress =
    user.kyc_status === "pending" || user.kyc_status === "approved";
  const verification = useInvestorVerification(user, inProgress);

  useEffect(() => {
    if (!inProgress) return;
    const id = window.setInterval(() => {
      void refreshUser();
    }, 5000);
    return () => window.clearInterval(id);
  }, [inProgress, refreshUser]);

  return (
    <VerificationSummary
      user={user}
      verification={verification}
      refreshUser={refreshUser}
      profile
    />
  );
}
