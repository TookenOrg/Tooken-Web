import type { KycVerification } from "@/lib/api/types";

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
  const t = (f: KycVerification) =>
    new Date(f.submitted_at ?? f.created_at).getTime() || 0;
  return [...files].sort((a, b) =>
    tab === "submitted" ? t(a) - t(b) : t(b) - t(a),
  );
}

/**
 * An approved file still has to be registered on-chain before the investor
 * can subscribe. `kyc_status` is only returned on the file detail: when it is
 * missing the answer is unknown (`undefined`).
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
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
