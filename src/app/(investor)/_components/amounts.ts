import { formatMoney } from "@/lib/format";

/** Formats a per-currency amount map; the first currency is the headline. */
export function formatAmounts(
  amounts: Record<string, string>,
  fallbackCurrency = "EUR",
): { primary: string; others: string[] } {
  const entries = Object.entries(amounts);
  if (!entries.length) {
    return { primary: formatMoney("0", fallbackCurrency), others: [] };
  }
  const [first, ...rest] = entries;
  return {
    primary: formatMoney(first[1], first[0]),
    others: rest.map(([c, v]) => formatMoney(v, c)),
  };
}
