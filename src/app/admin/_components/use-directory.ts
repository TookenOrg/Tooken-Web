"use client";

import { useMemo } from "react";
import { useKycList, useRealEstates } from "@/lib/api/hooks";
import { useSession } from "@/lib/auth/session-context";
import { type InvestorInfo, investorDirectory } from "@/lib/order-book";

/**
 * Resolves investor identities (from KYC filings, ADMIN only) and asset titles
 * so the order book can show names instead of bare ids.
 */
export function useBackOfficeDirectory() {
  const { isAdmin } = useSession();
  const kyc = useKycList({}, isAdmin);
  const estates = useRealEstates();

  const investors = useMemo(() => investorDirectory(kyc.data), [kyc.data]);
  const assetTitles = useMemo(
    () =>
      new Map(
        (estates.data ?? []).map((e) => [e.id, e.title ?? `Asset #${e.id}`]),
      ),
    [estates.data],
  );

  return { investors, assetTitles, canSeeInvestors: isAdmin };
}

export function investorLabel(
  userId: number,
  info: InvestorInfo | undefined,
): string {
  if (!info) return `User #${userId}`;
  return info.fullName
    ? `${info.fullName} (${info.email ?? `#${userId}`})`
    : `User #${userId}`;
}
