import type { KycOnChainStatus, KycVerification } from "@/lib/api/types";
import { canInvest } from "@/lib/status";

export type KycTab = "submitted" | "approved" | "rejected" | "revoked" | "all";

export const KYC_TABS: { key: KycTab; label: string }[] = [
  { key: "submitted", label: "To review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "revoked", label: "Revoked" },
  { key: "all", label: "All" },
];

export function kycTabCounts(
  files: readonly Pick<KycVerification, "status">[],
): Record<KycTab, number> {
  const counts: Record<KycTab, number> = {
    submitted: 0,
    approved: 0,
    rejected: 0,
    revoked: 0,
    all: files.length,
  };
  for (const f of files) {
    if (f.status in counts && f.status !== "all") {
      counts[f.status as KycTab] += 1;
    }
  }
  return counts;
}

/** Filters by status tab and free text (name, e-mail, country, user or file id). */
export function filterKycFiles<T extends KycVerification>(
  files: readonly T[],
  { tab = "all", query = "" }: { tab?: KycTab; query?: string } = {},
): T[] {
  const q = query.trim().toLowerCase();
  return files.filter((f) => {
    if (tab !== "all" && f.status !== tab) return false;
    if (!q) return true;
    return [
      f.declared_full_name,
      f.email,
      f.declared_country_code,
      String(f.user_id),
      String(f.id),
    ].some((v) => v?.toLowerCase().includes(q));
  });
}

/** Oldest submissions first, so the review queue is worked in arrival order. */
export function sortKycFiles<T extends KycVerification>(
  files: readonly T[],
  tab: KycTab,
): T[] {
  const submittedAt = (f: KycVerification) =>
    f.submitted_at ? Date.parse(f.submitted_at) : Number.NaN;
  return [...files].sort((a, b) => {
    const aTime = submittedAt(a);
    const bTime = submittedAt(b);
    if (!Number.isFinite(aTime))
      return Number.isFinite(bTime) ? 1 : a.id - b.id;
    if (!Number.isFinite(bTime)) return -1;
    return (tab === "submitted" ? aTime - bTime : bTime - aTime) || a.id - b.id;
  });
}

/**
 * A candidate for sync based on the account status, not a live registry
 * verdict. The detail may omit `kyc_status`, in which case it is unknown.
 */
export function needsOnChainSync(
  file: Pick<KycVerification, "status" | "kyc_status">,
): boolean | undefined {
  if (file.status !== "approved") return false;
  if (!file.kyc_status) return undefined;
  return file.kyc_status !== "verified";
}

export function isKycExpired(
  file: Pick<KycVerification, "expires_at">,
  now = Date.now(),
): boolean {
  if (!file.expires_at) return false;
  const t = new Date(file.expires_at).getTime();
  return !Number.isNaN(t) && t <= now;
}

/** `YYYY-MM-DD` one year from `now`, the default validity of an approval. */
export function defaultKycExpiry(now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate()),
  );
  return d.toISOString().slice(0, 10);
}

/** Converts a date input value to the ISO timestamp the approve endpoint expects. */
export function expiryDateToIso(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const iso = d.toISOString();
  return iso.slice(0, 10) === date ? iso : null;
}

export type RegistryVerdict =
  | "checking"
  | "verified"
  | "not_verified"
  | "unavailable";

/** Do not use stale, malformed, or another account's registry result. */
export function registryVerdict(
  data: KycOnChainStatus | undefined,
  {
    userId,
    loading,
    error,
  }: { userId: number; loading: boolean; error: boolean },
): RegistryVerdict {
  if (error) return "unavailable";
  if (loading && !data) return "checking";
  if (!data || data.user_id !== userId || typeof data.is_verified !== "boolean")
    return "unavailable";
  return data.is_verified ? "verified" : "not_verified";
}

export type InvestorVerificationKind =
  | "required"
  | "under_review"
  | "registration_pending"
  | "ready"
  | "renewal"
  | "rejected"
  | "revoked"
  | "checking"
  | "unavailable"
  | "conflict";

export type InvestorVerificationState = {
  kind: InvestorVerificationKind;
  canFile: boolean;
};

/** Account approval and the live registry verdict are independent signals. */
export function investorVerificationState(
  {
    status,
    expiresAt,
    registry,
  }: {
    status: string | null | undefined;
    expiresAt: string | null | undefined;
    registry: RegistryVerdict;
  },
  now = Date.now(),
): InvestorVerificationState {
  const known = [
    "none",
    "pending",
    "approved",
    "verified",
    "rejected",
    "revoked",
    "expired",
  ].includes(status ?? "");
  if (!known) return { kind: "unavailable", canFile: false };

  const expiry = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const expired =
    (status === "verified" || status === "approved") &&
    Number.isFinite(expiry) &&
    expiry <= now;
  const canFile =
    expired ||
    ["none", "rejected", "revoked", "expired"].includes(status ?? "");

  if (
    (registry === "verified" && (status !== "verified" || expired)) ||
    (registry === "not_verified" && status === "verified" && !expired)
  ) {
    return { kind: "conflict", canFile };
  }
  if (expired || status === "expired") return { kind: "renewal", canFile };
  if (status === "none") return { kind: "required", canFile };
  if (status === "pending") return { kind: "under_review", canFile };
  if (status === "approved") return { kind: "registration_pending", canFile };
  if (status === "rejected") return { kind: "rejected", canFile };
  if (status === "revoked") return { kind: "revoked", canFile };
  if (registry === "checking") return { kind: "checking", canFile };
  if (
    registry !== "verified" ||
    !Number.isFinite(expiry) ||
    !canInvest(status, expiresAt, now)
  )
    return { kind: "unavailable", canFile };
  return { kind: "ready", canFile };
}
