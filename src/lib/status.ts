import type { KycStatus, OrderStatusCode } from "@/lib/api/types";

export type Tone = "neutral" | "info" | "warning" | "success" | "danger";

type StatusMeta = { label: string; tone: Tone; description?: string };

export const ORDER_STATUS: Record<OrderStatusCode, StatusMeta> = {
  CREATED: {
    label: "Created",
    tone: "neutral",
    description: "The order has been registered.",
  },
  AWAITING_PAYMENT: {
    label: "Awaiting payment",
    tone: "warning",
    description: "Shares are reserved until the payment is received.",
  },
  PAYMENT_CONFIRMED: {
    label: "Payment confirmed",
    tone: "info",
    description: "Funds received. Token delivery is being prepared.",
  },
  DELIVERY_IN_PROGRESS: {
    label: "Delivery in progress",
    tone: "info",
    description: "Security tokens are being minted to your wallet.",
  },
  DELIVERED: {
    label: "Delivered",
    tone: "success",
    description: "Security tokens have been delivered on-chain.",
  },
  CLOSED: {
    label: "Settled",
    tone: "success",
    description: "The order is fully settled.",
  },
  DELIVERY_FAILED: {
    label: "Delivery failed",
    tone: "danger",
    description: "On-chain delivery failed.",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "neutral",
    description: "The order was cancelled.",
  },
  EXPIRED: {
    label: "Expired",
    tone: "neutral",
    description: "The reservation expired before payment was received.",
  },
  REVERSAL_IN_PROGRESS: { label: "Reversal in progress", tone: "warning" },
  REVERSAL_FAILED: { label: "Reversal failed", tone: "danger" },
  REFUND_PENDING: { label: "Refund pending", tone: "warning" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
};

export function orderStatusMeta(code: string | undefined | null): StatusMeta {
  return (
    ORDER_STATUS[code as OrderStatusCode] ?? {
      label: code ? humanize(code) : "Unknown",
      tone: "neutral",
    }
  );
}

/** Statuses the backend moves forward on its own, or that an operator is expected to move. */
const IN_FLIGHT: ReadonlySet<string> = new Set([
  "CREATED",
  "AWAITING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "DELIVERY_IN_PROGRESS",
  "DELIVERED",
  "REVERSAL_IN_PROGRESS",
  "REFUND_PENDING",
]);

export function isOrderInFlight(code: string | undefined | null): boolean {
  return !!code && IN_FLIGHT.has(code);
}

export function isOrderSettled(code: string | undefined | null): boolean {
  return code === "DELIVERED" || code === "CLOSED";
}

export type TimelineStep = {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming" | "failed";
};

const ORDER_STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "payment", label: "Payment" },
  { key: "delivery", label: "Token delivery" },
  { key: "settled", label: "Settled" },
] as const;

/** Maps a status onto the four-step settlement timeline shown to investors. */
export function orderTimeline(code: string | undefined | null): TimelineStep[] {
  let reached = 0;
  let failedAt = -1;
  switch (code) {
    case "CREATED":
      reached = 0;
      break;
    case "AWAITING_PAYMENT":
      reached = 1;
      break;
    case "PAYMENT_CONFIRMED":
    case "DELIVERY_IN_PROGRESS":
      reached = 2;
      break;
    case "DELIVERED":
      reached = 3;
      break;
    case "CLOSED":
      reached = 4;
      break;
    case "DELIVERY_FAILED":
      failedAt = 2;
      break;
    case "CANCELLED":
    case "EXPIRED":
      failedAt = 1;
      break;
    case "REVERSAL_IN_PROGRESS":
    case "REVERSAL_FAILED":
    case "REFUND_PENDING":
    case "REFUNDED":
      failedAt = 3;
      break;
  }
  return ORDER_STEPS.map((step, i) => {
    if (failedAt >= 0) {
      if (i < failedAt) return { ...step, state: "done" };
      if (i === failedAt) return { ...step, state: "failed" };
      return { ...step, state: "upcoming" };
    }
    if (i < reached) return { ...step, state: "done" };
    if (i === reached) return { ...step, state: "current" };
    return { ...step, state: "upcoming" };
  });
}

export const REAL_ESTATE_STATUS: Record<string, StatusMeta> = {
  draft: { label: "Draft", tone: "neutral" },
  in_review: { label: "In review", tone: "warning" },
  published: { label: "Published", tone: "info" },
  fundraising: { label: "Open for subscription", tone: "success" },
  funded: { label: "Fully funded", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function realEstateStatusMeta(
  status: string | undefined | null,
): StatusMeta {
  return (
    REAL_ESTATE_STATUS[status ?? ""] ?? {
      label: status ? humanize(status) : "Unknown",
      tone: "neutral",
    }
  );
}

export const KYC_STATUS: Record<KycStatus, StatusMeta> = {
  none: {
    label: "Not started",
    tone: "neutral",
    description: "Identity verification has not been submitted.",
  },
  pending: {
    label: "Under review",
    tone: "warning",
    description: "Your file is being reviewed by our compliance team.",
  },
  approved: {
    label: "Approved",
    tone: "info",
    description: "Approved by compliance. On-chain registration is pending.",
  },
  verified: {
    label: "Verified",
    tone: "success",
    description: "Your identity is verified and registered on-chain.",
  },
  rejected: {
    label: "Rejected",
    tone: "danger",
    description: "Your verification was rejected.",
  },
  expired: {
    label: "Expired",
    tone: "warning",
    description: "Your verification has expired.",
  },
  revoked: {
    label: "Revoked",
    tone: "danger",
    description: "Your verification has been revoked.",
  },
};

export function kycStatusMeta(status: string | undefined | null): StatusMeta {
  return (
    KYC_STATUS[status as KycStatus] ?? {
      label: status ? humanize(status) : "Unknown",
      tone: "neutral",
    }
  );
}

/** KYC verification file statuses, as stored on a verification. */
export const KYC_FILE_STATUS: Record<string, StatusMeta> = {
  submitted: { label: "Submitted", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  revoked: { label: "Revoked", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
};

export function kycFileStatusMeta(
  status: string | undefined | null,
): StatusMeta {
  return (
    KYC_FILE_STATUS[status ?? ""] ?? {
      label: status ? humanize(status) : "Unknown",
      tone: "neutral",
    }
  );
}

/** An investor may subscribe only with a verified, unexpired KYC. */
export function canInvest(
  kycStatus: string | undefined | null,
  kycExpiresAt: string | undefined | null,
  now = Date.now(),
): boolean {
  if (kycStatus !== "verified") return false;
  if (!kycExpiresAt) return true;
  return new Date(kycExpiresAt).getTime() > now;
}

export const ISSUER_STATUS: Record<string, StatusMeta & { id: number }> = {
  draft: { id: 1, label: "Draft", tone: "neutral" },
  active: { id: 2, label: "Active", tone: "success" },
  suspended: { id: 3, label: "Suspended", tone: "warning" },
  dissolved: { id: 4, label: "Dissolved", tone: "danger" },
};

export function issuerStatusMeta(
  status: string | undefined | null,
): StatusMeta {
  return (
    ISSUER_STATUS[status ?? ""] ?? {
      label: status ? humanize(status) : "Unknown",
      tone: "neutral",
    }
  );
}

export function humanize(code: string): string {
  const s = code.replace(/[_-]+/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
