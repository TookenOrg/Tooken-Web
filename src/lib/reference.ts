/**
 * Reference tables the backend stores but does not expose through the API.
 * Identifiers must match ass.real_estate_type and ass.payment_frequency_type.
 */

export const ESTATE_TYPES = [
  { id: 1, code: "building", label: "Residential building" },
  { id: 2, code: "business building", label: "Office building" },
  { id: 3, code: "local commercial", label: "Retail premises" },
  { id: 4, code: "warehouse", label: "Logistics / warehouse" },
] as const;

export function estateTypeLabel(
  code: string | null | undefined,
  id?: number | null,
): string {
  const found = ESTATE_TYPES.find((t) => t.code === code || t.id === id);
  return (
    found?.label ?? (code ? code.charAt(0).toUpperCase() + code.slice(1) : "—")
  );
}

export const PAYMENT_FREQUENCY_TYPES = [
  { id: 4, code: "MONTH", label: "Month" },
  { id: 5, code: "YEAR", label: "Year" },
  { id: 3, code: "DAY", label: "Day" },
  { id: 2, code: "HOUR", label: "Hour" },
  { id: 1, code: "MINUTE", label: "Minute" },
] as const;

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;

export const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;

/** Claim topic 7 is the KYC topic required by the platform's T-REX suite. */
export const KYC_CLAIM_TOPIC = 7;

/** ISO 3166-1: alpha-2, numeric (needed by on-chain identities) and English name. */
export const COUNTRIES = [
  { code: "LU", numeric: 442, name: "Luxembourg" },
  { code: "FR", numeric: 250, name: "France" },
  { code: "BE", numeric: 56, name: "Belgium" },
  { code: "DE", numeric: 276, name: "Germany" },
  { code: "NL", numeric: 528, name: "Netherlands" },
  { code: "CH", numeric: 756, name: "Switzerland" },
  { code: "GB", numeric: 826, name: "United Kingdom" },
  { code: "IE", numeric: 372, name: "Ireland" },
  { code: "ES", numeric: 724, name: "Spain" },
  { code: "PT", numeric: 620, name: "Portugal" },
  { code: "IT", numeric: 380, name: "Italy" },
  { code: "AT", numeric: 40, name: "Austria" },
  { code: "DK", numeric: 208, name: "Denmark" },
  { code: "SE", numeric: 752, name: "Sweden" },
  { code: "NO", numeric: 578, name: "Norway" },
  { code: "FI", numeric: 246, name: "Finland" },
  { code: "PL", numeric: 616, name: "Poland" },
  { code: "CZ", numeric: 203, name: "Czechia" },
  { code: "GR", numeric: 300, name: "Greece" },
  { code: "MC", numeric: 492, name: "Monaco" },
  { code: "LI", numeric: 438, name: "Liechtenstein" },
  { code: "MT", numeric: 470, name: "Malta" },
  { code: "CY", numeric: 196, name: "Cyprus" },
  { code: "US", numeric: 840, name: "United States" },
  { code: "CA", numeric: 124, name: "Canada" },
  { code: "AE", numeric: 784, name: "United Arab Emirates" },
  { code: "SG", numeric: 702, name: "Singapore" },
  { code: "HK", numeric: 344, name: "Hong Kong" },
  { code: "JP", numeric: 392, name: "Japan" },
  { code: "AU", numeric: 36, name: "Australia" },
] as const;

export function countryName(code: string | null | undefined): string {
  if (!code) return "—";
  return (
    COUNTRIES.find((c) => c.code === code.toUpperCase())?.name ??
    code.toUpperCase()
  );
}

export function countryNumeric(
  code: string | null | undefined,
): number | undefined {
  return COUNTRIES.find((c) => c.code === code?.toUpperCase())?.numeric;
}
