import { z } from "zod";
import type {
  RealEstate,
  RealEstateConfigurationInput,
  RealEstateMediaInput,
  RealEstatePatchRequest,
  RealEstateWriteRequest,
} from "@/lib/api/types";
import { multiplyDecimal } from "@/lib/format";
import type { AssetFieldLocks } from "./asset-locks";

/**
 * Form model of an asset and the pure functions turning it into API payloads.
 * Every input is kept as a string so decimals never go through floating point.
 */

const DECIMAL = /^\d+(\.\d+)?$/;
const INTEGER = /^\d+$/;
const COORDINATE = /^-?\d{1,3}(\.\d{1,6})?$/;

const optionalDecimal = z
  .string()
  .trim()
  .refine((v) => v === "" || DECIMAL.test(v), "Enter a positive number");
const optionalInteger = z
  .string()
  .trim()
  .refine((v) => v === "" || INTEGER.test(v), "Enter a whole number");
const optionalRate = optionalDecimal.refine(
  (v) => v === "" || Number(v) <= 100,
  "Must be between 0 and 100",
);
const optionalCoordinate = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || COORDINATE.test(v),
    "Up to 6 decimals, e.g. 49.611622",
  );

export const assetFormSchema = z
  .object({
    title: z.string().trim().min(3, "Enter the asset name").max(200),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be at most 2,000 characters"),
    estate_type_id: z.string().min(1, "Select an asset type"),
    issuer_id: z.string().min(1, "Select the issuing vehicle"),
    address: z.object({
      street: z.string().trim().min(1, "Enter the street"),
      street_complement: z.string().trim(),
      postal_code: z.string().trim().min(1, "Enter the postal code"),
      city: z.string().trim().min(1, "Enter the city"),
      region: z.string().trim(),
      country_code: z.string().length(2, "Select a country"),
      latitude: optionalCoordinate,
      longitude: optionalCoordinate,
    }),
    specification: z.object({
      surface_area: optionalDecimal,
      lot_size: optionalDecimal,
      terrace_size: optionalDecimal,
      pool_size: optionalDecimal,
      bedroom_number: optionalInteger,
      bathroom_number: optionalInteger,
      build_year: optionalInteger.refine(
        (v) => v === "" || (Number(v) >= 1600 && Number(v) <= 2100),
        "Enter a valid year",
      ),
      energy_class: z.string(),
      ges_class: z.string(),
    }),
    configuration: z.object({
      total_shares: optionalInteger,
      price_per_share: optionalDecimal,
      currency_code: z.string(),
      yield: optionalDecimal,
      payment_frequency: optionalInteger,
      payment_frequency_type_id: z.string(),
      max_shares_per_investor: optionalInteger,
      min_investment: optionalDecimal,
      max_investment: optionalDecimal,
      entry_fee_rate: optionalRate,
      mgmt_fee_rate: optionalRate,
      exit_fee_rate: optionalRate,
      compartment_ref: z.string().trim().max(64),
    }),
    media: z.array(
      z.object({
        url: z
          .string()
          .trim()
          .url("Enter a valid URL")
          .refine((v) => v.startsWith("https://"), "Use an https:// URL"),
        alt_text: z.string().trim().max(200),
        is_cover: z.boolean(),
        media_type: z.string().optional(),
      }),
    ),
  })
  .superRefine((v, ctx) => {
    const c = v.configuration;
    const hasEconomics = Object.entries(c).some(
      ([k, x]) => k !== "currency_code" && x.trim() !== "",
    );
    if (hasEconomics) {
      const required: [keyof typeof c, string][] = [
        ["total_shares", "Enter the number of shares"],
        ["price_per_share", "Enter the price per share"],
        ["currency_code", "Select a currency"],
        ["payment_frequency", "Enter the payment frequency"],
        ["payment_frequency_type_id", "Select a period"],
      ];
      for (const [key, message] of required) {
        if (c[key].trim() === "") {
          ctx.addIssue({
            code: "custom",
            path: ["configuration", key],
            message,
          });
        }
      }
    }
    if (/^0+$/.test(c.total_shares.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["configuration", "total_shares"],
        message: "Must be greater than zero",
      });
    }
    if (
      INTEGER.test(c.max_shares_per_investor.trim()) &&
      INTEGER.test(c.total_shares.trim()) &&
      BigInt(c.max_shares_per_investor.trim()) > BigInt(c.total_shares.trim())
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["configuration", "max_shares_per_investor"],
        message: "Cannot exceed the total number of shares",
      });
    }
    const a = v.address;
    if ((a.latitude.trim() === "") !== (a.longitude.trim() === "")) {
      ctx.addIssue({
        code: "custom",
        path: ["address", a.latitude.trim() === "" ? "latitude" : "longitude"],
        message: "Set latitude and longitude together",
      });
    }
    if (v.media.filter((m) => m.is_cover).length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["media"],
        message: "Only one image can be the cover",
      });
    }
  });

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export function emptyAssetValues(): AssetFormValues {
  return {
    title: "",
    description: "",
    estate_type_id: "",
    issuer_id: "",
    address: {
      street: "",
      street_complement: "",
      postal_code: "",
      city: "",
      region: "",
      country_code: "LU",
      latitude: "",
      longitude: "",
    },
    specification: {
      surface_area: "",
      lot_size: "",
      terrace_size: "",
      pool_size: "",
      bedroom_number: "",
      bathroom_number: "",
      build_year: "",
      energy_class: "",
      ges_class: "",
    },
    configuration: {
      total_shares: "",
      price_per_share: "",
      currency_code: "",
      yield: "",
      payment_frequency: "",
      payment_frequency_type_id: "",
      max_shares_per_investor: "",
      min_investment: "",
      max_investment: "",
      entry_fee_rate: "",
      mgmt_fee_rate: "",
      exit_fee_rate: "",
      compartment_ref: "",
    },
    media: [],
  };
}

const str = (v: string | number | null | undefined) =>
  v === null || v === undefined ? "" : String(v);

/** Prefills the form from a stored asset. */
export function assetToFormValues(re: RealEstate): AssetFormValues {
  const base = emptyAssetValues();
  const a = re.address;
  const s = re.specification;
  const c = re.configuration;
  const media = [...(re.media ?? [])].sort(
    (x, y) => (x.position ?? 0) - (y.position ?? 0),
  );
  return {
    title: str(re.title),
    description: str(re.description),
    estate_type_id: str(re.estate_type_id),
    issuer_id: str(re.issuer?.id),
    address: {
      street: str(a?.street),
      street_complement: str(a?.street_complement),
      postal_code: str(a?.postal_code),
      city: str(a?.city ?? re.location?.city),
      region: str(a?.region),
      country_code: str(
        a?.country_code ??
          re.location?.country_code ??
          base.address.country_code,
      ),
      latitude: str(a?.latitude),
      longitude: str(a?.longitude),
    },
    specification: {
      surface_area: str(s?.surface_area),
      lot_size: str(s?.lot_size),
      terrace_size: str(s?.terrace_size),
      pool_size: str(s?.pool_size),
      bedroom_number: str(s?.bedroom_number),
      bathroom_number: str(s?.bathroom_number),
      build_year: str(s?.build_year),
      energy_class: str(s?.energy_class),
      ges_class: str(s?.ges_class),
    },
    configuration: {
      ...base.configuration,
      total_shares: str(c?.total_shares),
      price_per_share: str(c?.price_per_share),
      currency_code: str(c?.currency_code),
      yield: str(c?.yield),
      payment_frequency: str(c?.payment_frequency),
      payment_frequency_type_id: str(c?.payment_frequency_type_id),
      max_shares_per_investor: str(c?.max_shares_per_investor),
      min_investment: str(c?.min_investment),
      max_investment: str(c?.max_investment),
      entry_fee_rate: str(c?.entry_fee_rate),
      mgmt_fee_rate: str(c?.mgmt_fee_rate),
      exit_fee_rate: str(c?.exit_fee_rate),
      compartment_ref: str(c?.compartment_ref),
    },
    media: media
      .filter((m) => !!m.url)
      .map((m) => ({
        url: m.url ?? "",
        alt_text: str(m.alt_text),
        is_cover: !!m.is_cover,
        media_type: m.media_type || "image",
      })),
  };
}

/** total_shares × price_per_share, exact; null while either is incomplete. */
export function computeValuation(
  totalShares: string,
  pricePerShare: string,
): string | null {
  const t = totalShares.trim();
  const p = pricePerShare.trim();
  if (!INTEGER.test(t) || !DECIMAL.test(p)) return null;
  return multiplyDecimal(t, p, 2);
}

/** Drops empty values so absent fields are omitted from the payload. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== "" && v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

const toInt = (v: string) => (v.trim() === "" ? undefined : Number(v));

function mediaInputs(
  media: AssetFormValues["media"],
  defaultCover = true,
): RealEstateMediaInput[] {
  const hasCover = media.some((m) => m.is_cover);
  return media.map((m, i) => ({
    url: m.url.trim(),
    ...(m.alt_text.trim() ? { alt_text: m.alt_text.trim() } : {}),
    media_type: m.media_type || "image",
    position: i,
    is_cover: hasCover ? m.is_cover : defaultCover && i === 0,
  }));
}

function coverUrl(media: AssetFormValues["media"]): string | undefined {
  return (media.find((m) => m.is_cover) ?? media[0])?.url.trim() || undefined;
}

function specificationInput(s: AssetFormValues["specification"]) {
  return compact({
    surface_area: s.surface_area.trim(),
    lot_size: s.lot_size.trim(),
    terrace_size: s.terrace_size.trim(),
    pool_size: s.pool_size.trim(),
    bedroom_number: toInt(s.bedroom_number),
    bathroom_number: toInt(s.bathroom_number),
    build_year: toInt(s.build_year),
    energy_class: s.energy_class,
    ges_class: s.ges_class,
  });
}

function configurationInput(c: AssetFormValues["configuration"]) {
  return compact({
    total_shares: c.total_shares.trim(),
    price_per_share: c.price_per_share.trim(),
    currency_code: c.currency_code,
    yield: c.yield.trim(),
    payment_frequency: toInt(c.payment_frequency),
    payment_frequency_type_id: toInt(c.payment_frequency_type_id),
    max_shares_per_investor: c.max_shares_per_investor.trim(),
    min_investment: c.min_investment.trim(),
    max_investment: c.max_investment.trim(),
    entry_fee_rate: c.entry_fee_rate.trim(),
    mgmt_fee_rate: c.mgmt_fee_rate.trim(),
    exit_fee_rate: c.exit_fee_rate.trim(),
    compartment_ref: c.compartment_ref.trim(),
  });
}

/** Full creation payload. Optional sections are omitted when left blank. */
export function buildCreatePayload(v: AssetFormValues): RealEstateWriteRequest {
  const spec = specificationInput(v.specification);
  const config = configurationInput(v.configuration);
  const hasEconomics = Object.keys(config).some((k) => k !== "currency_code");
  const media = mediaInputs(v.media);
  const cover = coverUrl(v.media);
  return {
    title: v.title.trim(),
    ...(v.description.trim() ? { description: v.description.trim() } : {}),
    ...(cover ? { imageurl: cover } : {}),
    estate_type_id: Number(v.estate_type_id),
    issuer_id: Number(v.issuer_id),
    address: {
      street: v.address.street.trim(),
      postal_code: v.address.postal_code.trim(),
      city: v.address.city.trim(),
      country_code: v.address.country_code,
      ...compact({
        street_complement: v.address.street_complement.trim(),
        region: v.address.region.trim(),
        latitude: v.address.latitude.trim(),
        longitude: v.address.longitude.trim(),
      }),
    },
    ...(Object.keys(spec).length ? { specification: spec } : {}),
    ...(hasEconomics
      ? { configuration: config as RealEstateConfigurationInput }
      : {}),
    ...(media.length ? { media } : {}),
  };
}

/**
 * Fields of `next` that differ from `prev`. A cleared text field is sent as ""
 * (the API reads it as "no value"); a cleared numeric field cannot be
 * expressed and is left untouched.
 */
function diffSection<T extends Record<string, string>>(
  prev: T,
  next: T,
  numeric: readonly string[] = [],
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const key of Object.keys(next)) {
    const a = prev[key]?.trim() ?? "";
    const b = next[key]?.trim() ?? "";
    if (a === b) continue;
    if (numeric.includes(key)) {
      if (b !== "") out[key] = Number(b);
    } else {
      out[key] = b;
    }
  }
  return out;
}

const SPEC_NUMERIC = ["bedroom_number", "bathroom_number", "build_year"];
const CONFIG_NUMERIC = ["payment_frequency", "payment_frequency_type_id"];

/** Minimal PATCH: only what changed between the initial and current values. */
export function buildPatchPayload(
  initial: AssetFormValues,
  current: AssetFormValues,
  locks: AssetFieldLocks = {},
): RealEstatePatchRequest {
  const patch: RealEstatePatchRequest = {};
  if (!locks.title && initial.title.trim() !== current.title.trim()) {
    patch.title = current.title.trim();
  }
  if (initial.description.trim() !== current.description.trim()) {
    patch.description = current.description.trim();
  }
  if (initial.estate_type_id !== current.estate_type_id) {
    patch.estate_type_id = Number(current.estate_type_id);
  }
  if (initial.issuer_id !== current.issuer_id) {
    patch.issuer_id = Number(current.issuer_id);
  }

  const address = diffSection(initial.address, current.address);
  if (Object.keys(address).length) patch.address = address;

  const spec = diffSection(
    initial.specification,
    current.specification,
    SPEC_NUMERIC,
  );
  if (Object.keys(spec).length) patch.specification = spec;

  const config = diffSection(
    initial.configuration,
    current.configuration,
    CONFIG_NUMERIC,
  );
  if (locks["configuration.total_shares"]) delete config.total_shares;
  if (locks["configuration.max_shares_per_investor"]) {
    delete config.max_shares_per_investor;
  }
  if (Object.keys(config).length) patch.configuration = config;

  const nextMedia = mediaInputs(current.media, false);
  if (
    JSON.stringify(mediaInputs(initial.media, false)) !==
    JSON.stringify(nextMedia)
  ) {
    patch.media = nextMedia;
    const cover = coverUrl(current.media) ?? "";
    if (cover !== (coverUrl(initial.media) ?? "")) patch.imageurl = cover;
  }
  return patch;
}
