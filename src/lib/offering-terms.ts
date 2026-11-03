import type { RealEstate } from "@/lib/api/types";
import { formatMoney, formatPercent } from "@/lib/format";

type Configuration = NonNullable<RealEstate["configuration"]>;

/** Investment bounds, fees and compartment, limited to what is configured. */
export function offeringTerms(
  cfg: Configuration | null | undefined,
): { label: string; value: string }[] {
  if (!cfg) return [];
  const currency = cfg.currency_code || "EUR";
  const rows: [string, string | undefined, (v: string) => string][] = [
    ["Minimum investment", cfg.min_investment, (v) => formatMoney(v, currency)],
    ["Maximum investment", cfg.max_investment, (v) => formatMoney(v, currency)],
    ["Entry fee", cfg.entry_fee_rate, (v) => formatPercent(v)],
    ["Management fee", cfg.mgmt_fee_rate, (v) => `${formatPercent(v)} p.a.`],
    ["Exit fee", cfg.exit_fee_rate, (v) => formatPercent(v)],
    ["Compartment", cfg.compartment_ref, (v) => v],
  ];
  return rows.flatMap(([label, raw, fmt]) =>
    raw?.trim() ? [{ label, value: fmt(raw.trim()) }] : [],
  );
}
