"use client";

import {
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
} from "lucide-react";
import Link from "next/link";
import { KycStatusBadge } from "@/components/app/status-badges";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { canInvest, kycStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

/** KYC call-to-action shown on the dashboard and profile. */
export function KycBanner({
  user,
  className,
}: {
  user: User;
  className?: string;
}) {
  const status = user.kyc_status ?? "none";
  const eligible = canInvest(status, user.kyc_expires_at);
  const inReview = status === "pending" || status === "approved";
  const verifiedButExpired = status === "verified" && !eligible;

  if (eligible) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-5 py-4 sm:flex-row sm:items-center",
          className,
        )}
      >
        <ShieldCheck className="size-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            Identity verified <KycStatusBadge status={status} />
          </div>
          <p className="text-xs text-muted-foreground">
            You are eligible to subscribe to open offerings.
            {user.kyc_expires_at ? (
              <>
                {" "}
                Verification valid until{" "}
                <span className="font-medium text-ink tabular">
                  {formatDate(user.kyc_expires_at)}
                </span>
                .
              </>
            ) : null}
          </p>
        </div>
      </div>
    );
  }

  const Icon = inReview ? ShieldEllipsis : ShieldAlert;
  const title = inReview
    ? "Verification in progress"
    : verifiedButExpired
      ? "Your verification has expired"
      : status === "none"
        ? "Verify your identity to start investing"
        : kycStatusMeta(status).description;
  const body = inReview
    ? kycStatusMeta(status).description
    : "Security tokens can only be held by verified investors (ERC-3643). Verification takes a few minutes to submit.";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-5 py-4 sm:flex-row sm:items-center",
        inReview
          ? "border-cyan-200 bg-cyan-50/60"
          : "border-amber-200 bg-amber-50/70",
        className,
      )}
    >
      <Icon
        className={cn(
          "size-5 shrink-0",
          inReview ? "text-cyan-700" : "text-amber-600",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
          {title}{" "}
          <KycStatusBadge status={verifiedButExpired ? "expired" : status} />
        </div>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
      <Button
        asChild
        size="sm"
        className={
          inReview
            ? undefined
            : "bg-brand text-brand-foreground hover:bg-brand-light"
        }
        variant={inReview ? "outline" : "default"}
      >
        <Link href="/verification">
          {inReview ? "Track status" : "Start verification"} <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
