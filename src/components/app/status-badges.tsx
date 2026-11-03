import {
  isOrderInFlight,
  issuerStatusMeta,
  kycFileStatusMeta,
  kycStatusMeta,
  orderStatusMeta,
  realEstateStatusMeta,
} from "@/lib/status";
import { StatusBadge } from "./status-badge";

export function OrderStatusBadge({
  code,
}: {
  code: string | undefined | null;
}) {
  const meta = orderStatusMeta(code);
  const moving = isOrderInFlight(code) && code !== "AWAITING_PAYMENT";
  return (
    <StatusBadge tone={meta.tone} pulse={moving}>
      {meta.label}
    </StatusBadge>
  );
}

export function RealEstateStatusBadge({
  status,
}: {
  status: string | undefined | null;
}) {
  const meta = realEstateStatusMeta(status);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function KycStatusBadge({
  status,
}: {
  status: string | undefined | null;
}) {
  const meta = kycStatusMeta(status);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function KycFileStatusBadge({
  status,
}: {
  status: string | undefined | null;
}) {
  const meta = kycFileStatusMeta(status);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function IssuerStatusBadge({
  status,
}: {
  status: string | undefined | null;
}) {
  const meta = issuerStatusMeta(status);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}
