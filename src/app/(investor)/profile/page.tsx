"use client";

import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { KeyValueList } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { PageSkeleton } from "@/components/app/states";
import { KycStatusBadge } from "@/components/app/status-badges";
import { roleLabel, UserAvatar } from "@/components/app/user-menu";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/session-context";
import { formatDate, formatDateTime } from "@/lib/format";
import { countryName } from "@/lib/reference";
import { canInvest } from "@/lib/status";
import { OnChainIdentityPanel } from "../_components/onchain-identity";

export default function ProfilePage() {
  const { user, userLoading, isInvestor, isStaff } = useSession();
  if (userLoading || !user) return <PageSkeleton />;

  const status = user.kyc_status ?? "none";
  const eligible = canInvest(status, user.kyc_expires_at);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
        description="Your account details, verification status and security settings."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelBody className="flex items-center gap-4">
              <UserAvatar name={user.full_name} className="size-14 text-base" />
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-ink">
                  {user.full_name}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {user.email} · {roleLabel(user.role)}
                </div>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Account"
              description="Contact support to change your legal name or e-mail address."
            />
            <PanelBody>
              <KeyValueList
                columns={2}
                items={[
                  { label: "Full name", value: user.full_name },
                  { label: "E-mail", value: user.email },
                  { label: "Role", value: roleLabel(user.role) },
                  { label: "Client ID", value: `#${user.id}`, mono: true },
                  { label: "Member since", value: formatDate(user.created_at) },
                  {
                    label: "Last sign-in",
                    value: formatDateTime(user.last_connexion),
                  },
                  {
                    label: "Country",
                    value: user.country_code
                      ? countryName(user.country_code)
                      : "—",
                    hint: user.country_code
                      ? "From your verification"
                      : undefined,
                  },
                  {
                    label: "On-chain identity",
                    value:
                      status === "verified" ? "Registered" : "Not registered",
                    hint:
                      status === "verified"
                        ? "ONCHAINID with KYC claim"
                        : undefined,
                  },
                ]}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Preferences"
              description="Display settings applied to your workspace."
            />
            <PanelBody>
              <KeyValueList
                columns={2}
                items={[
                  { label: "Language", value: "English (UK)" },
                  { label: "Reference currency", value: "EUR" },
                  { label: "Number format", value: "1,234.56" },
                  { label: "Time zone", value: timeZone },
                  { label: "Order notifications", value: "E-mail" },
                  { label: "Distribution notices", value: "E-mail" },
                ]}
              />
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-6">
          {isInvestor ? (
            <Panel>
              <PanelHeader
                title="Identity verification"
                actions={
                  <KycStatusBadge
                    status={
                      eligible || status !== "verified" ? status : "expired"
                    }
                  />
                }
              />
              <PanelBody className="space-y-4">
                <KeyValueList
                  items={[
                    {
                      label: "Verified on",
                      value: formatDate(user.kyc_verified_at),
                    },
                    {
                      label: "Valid until",
                      value: formatDate(user.kyc_expires_at),
                    },
                    {
                      label: "Eligible to invest",
                      value: eligible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <ShieldCheck className="size-3.5" /> Yes
                        </span>
                      ) : (
                        "No"
                      ),
                    },
                  ]}
                />
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/verification">
                    {eligible ? "View verification" : "Complete verification"}{" "}
                    <ArrowRight />
                  </Link>
                </Button>
              </PanelBody>
            </Panel>
          ) : null}

          {isInvestor ? <OnChainIdentityPanel /> : null}

          <Panel>
            <PanelHeader title="Security" />
            <PanelBody className="space-y-4">
              <KeyValueList
                items={[
                  { label: "Authentication", value: "E-mail and password" },
                  { label: "Session", value: "Expires after 8 hours" },
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
