/**
 * Display helpers. Amounts and share counts travel as decimal strings so they
 * are never rounded by a JSON parser: they are formatted from the string and
 * multiplied with BigInt, never through floating point.
 */

export const LOCALE = "en-GB";

type Decimalish = string | number | null | undefined;

function toFormattable(value: Decimalish): number | null {
  if (value === null || value === undefined || value === "") return null;
  return value as number;
}

export function formatMoney(
  value: Decimalish,
  currency = "EUR",
  options: { decimals?: number; compact?: boolean } = {},
): string {
  const v = toFormattable(value);
  if (v === null) return "—";
  const decimals = options.decimals ?? 2;
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: currency || "EUR",
      notation: options.compact ? "compact" : "standard",
      minimumFractionDigits: options.compact ? 0 : decimals,
      maximumFractionDigits: options.compact ? 1 : decimals,
    }).format(v);
  } catch {
    return `${formatNumber(value, decimals)} ${currency}`;
  }
}

export function formatRecordedMoney(
  value: Decimalish,
  currency: string | null | undefined,
  options: { decimals?: number; compact?: boolean } = {},
): string {
  if (toFormattable(value) === null) return "—";
  const code = currency?.trim();
  return code && /^[A-Z]{3}$/.test(code)
    ? formatMoney(value, code, options)
    : "Currency unavailable";
}

export function formatNumber(value: Decimalish, maxDecimals = 0): string {
  const v = toFormattable(value);
  if (v === null) return "—";
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: maxDecimals,
  }).format(v);
}

/** `value` is already a percentage (4.8 means 4.8 %). */
export function formatPercent(value: Decimalish, decimals = 2): string {
  const v = toFormattable(value);
  if (v === null) return "—";
  return `${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v)} %`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** "in 12 min", "3 h ago"… */
export function formatRelative(
  value: string | null | undefined,
  now = Date.now(),
): string {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Math.round((t - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(diff, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function shortenHash(
  value: string | null | undefined,
  size = 6,
): string {
  if (!value) return "—";
  if (value.length <= size * 2 + 3) return value;
  return `${value.slice(0, size + 2)}…${value.slice(-size)}`;
}

const PERIOD_ADVERB: Record<string, string> = {
  MINUTE: "minute",
  HOUR: "hour",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

/** "Quarterly", "Monthly", "4× per year"… */
export function formatFrequency(
  frequency: number | null | undefined,
  periodType: string | null | undefined,
): string {
  const period = PERIOD_ADVERB[(periodType ?? "").toUpperCase()];
  if (!period) return "—";
  const n = frequency ?? 1;
  if (period === "year") {
    if (n === 1) return "Annual";
    if (n === 2) return "Semi-annual";
    if (n === 4) return "Quarterly";
    if (n === 12) return "Monthly";
  }
  if (n === 1) {
    return (
      {
        minute: "Every minute",
        hour: "Hourly",
        day: "Daily",
        week: "Weekly",
        month: "Monthly",
      }[period] ?? `Every ${period}`
    );
  }
  return `${n}× per ${period}`;
}

// --- Exact decimal arithmetic ------------------------------------------------

type Dec = { int: bigint; scale: number };

export function parseDecimal(value: string | number): Dec {
  const s = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`Invalid decimal: ${s}`);
  const negative = s.startsWith("-");
  const [whole, frac = ""] = s.replace("-", "").split(".");
  const int = BigInt(whole + frac) * (negative ? -1n : 1n);
  return { int, scale: frac.length };
}

function decimalToString({ int, scale }: Dec): string {
  const negative = int < 0n;
  const digits = (negative ? -int : int).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const frac = scale ? `.${digits.slice(-scale)}` : "";
  return `${negative ? "-" : ""}${whole}${frac}`;
}

function rescale(d: Dec, scale: number): Dec {
  if (scale >= d.scale) {
    return { int: d.int * 10n ** BigInt(scale - d.scale), scale };
  }
  const factor = 10n ** BigInt(d.scale - scale);
  const half = factor / 2n;
  const abs = d.int < 0n ? -d.int : d.int;
  const rounded = (abs + half) / factor;
  return { int: d.int < 0n ? -rounded : rounded, scale };
}

/** Exact product rounded half-up to `scale` decimals. */
export function multiplyDecimal(
  a: string | number,
  b: string | number,
  scale = 2,
): string {
  const x = parseDecimal(a);
  const y = parseDecimal(b);
  return decimalToString(
    rescale({ int: x.int * y.int, scale: x.scale + y.scale }, scale),
  );
}

/** Exact sum rounded half-up to `scale` decimals. */
export function addDecimal(
  a: string | number,
  b: string | number,
  scale = 2,
): string {
  const x = parseDecimal(a);
  const y = parseDecimal(b);
  const s = Math.max(x.scale, y.scale);
  return decimalToString(
    rescale({ int: rescale(x, s).int + rescale(y, s).int, scale: s }, scale),
  );
}

/** `amount × rate / 100`, rounded half-up to 2 decimals, as the backend computes fees. */
export function percentOf(
  amount: string | number,
  rate: string | number,
): string {
  const x = parseDecimal(amount);
  const y = parseDecimal(rate);
  return decimalToString(
    rescale({ int: x.int * y.int, scale: x.scale + y.scale + 2 }, 2),
  );
}

/** Compares two decimals: -1, 0 or 1. */
export function compareDecimal(a: string | number, b: string | number): number {
  const x = parseDecimal(a);
  const y = parseDecimal(b);
  const s = Math.max(x.scale, y.scale);
  const d = rescale(x, s).int - rescale(y, s).int;
  return d === 0n ? 0 : d > 0n ? 1 : -1;
}

/** Shares still available, from the decimal total and the integer sold count. */
export function remainingShares(
  totalShares: string | null | undefined,
  sold: number | null | undefined,
): number {
  if (!totalShares) return 0;
  try {
    const total = parseDecimal(totalShares);
    const whole = total.int / 10n ** BigInt(total.scale);
    const left = whole - BigInt(Math.max(0, sold ?? 0));
    return left > 0n ? Number(left) : 0;
  } catch {
    return 0;
  }
}
