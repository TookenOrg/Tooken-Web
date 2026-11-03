import { ApiError } from "@/lib/api/client";

const FIELD_LABELS: Record<string, string> = {
  title: "Name",
  description: "Description",
  media: "At least one image",
  imageurl: "Cover image",
  issuer: "Issuer",
  issuer_id: "Issuer",
  "configuration.total_shares": "Total shares",
  "configuration.price_per_share": "Price per share",
  "configuration.currency_code": "Currency",
  "configuration.yield": "Target yield",
  "configuration.payment_frequency": "Distribution frequency",
  "configuration.payment_frequency_type_id": "Distribution period",
  "configuration.max_shares_per_investor": "Max. shares per investor",
  "configuration.min_investment": "Minimum investment",
  "configuration.max_investment": "Maximum investment",
  "configuration.entry_fee_rate": "Entry fee",
  "configuration.mgmt_fee_rate": "Management fee",
  "configuration.exit_fee_rate": "Exit fee",
  "configuration.compartment_ref": "Compartment reference",
  registration_number: "Registration number",
};

/** Readable label for a field path sent in a 409 `missing_fields` list. */
export function missingFieldLabel(path: string): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  const last = path.split(".").pop() ?? path;
  const s = last.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Field paths of a 409 completeness conflict, or [] for any other error. */
export function missingFieldsOf(error: unknown): string[] {
  return error instanceof ApiError && error.status === 409
    ? error.missingFields
    : [];
}
