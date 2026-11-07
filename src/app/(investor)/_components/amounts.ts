import { formatMoney } from "@/lib/format";

/** Formats a per-currency amount map; the first currency is the headline. */
export function formatAmounts(
  amounts: Record<string, string | null>,
  fallbackCurrency = "EUR",
): { primary: string; others: string[] } {
  const entries = Object.entries(amounts);
  if (!entries.length) {
    return { primary: formatMoney("0", fallbackCurrency), others: [] };
  }
  const [first, ...rest] = entries;
  return {
    primary: first[1] === null ? first[0] : formatMoney(first[1], first[0]),
    others: rest.map(([c, v]) => (v === null ? c : formatMoney(v, c))),
  };
}
