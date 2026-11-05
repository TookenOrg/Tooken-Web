import { describe, expect, it } from "vitest";
import type { IssuanceOrder, RealEstate } from "@/lib/api/types";
import { subscriptionFill } from "./asset-metrics";
import {
  type AssetFormValues,
  assetFormSchema,
  assetToFormValues,
  buildCreatePayload,
  buildPatchPayload,
  computeValuation,
  emptyAssetValues,
} from "./asset-payload";

function gasperich(): AssetFormValues {
  const v = emptyAssetValues();
  return {
    ...v,
    title: "  Gasperich Office Park ",
    description: "Grade A offices.",
    estate_type_id: "2",
    issuer_id: "1",
    address: {
      ...v.address,
      street: "5 Rue Eugène Ruppert",
      postal_code: "2453",
      city: "Luxembourg",
      latitude: "49.585",
      longitude: "6.122",
    },
    specification: {
      ...v.specification,
      surface_area: "6400.5",
      build_year: "2021",
      energy_class: "A",
    },
    configuration: {
      ...v.configuration,
      total_shares: "8000",
      price_per_share: "500",
      yield: "5.2",
      payment_frequency: "4",
      payment_frequency_type_id: "5",
      max_shares_per_investor: "400",
      entry_fee_rate: "2",
    },
    media: [
      { url: "https://img.example/a.jpg", alt_text: "", is_cover: false },
      { url: "https://img.example/b.jpg", alt_text: "Lobby", is_cover: true },
    ],
  };
}

const stored: RealEstate = {
  id: 7,
  title: "Gasperich Office Park",
  description: "Grade A offices.",
  estate_type_id: 2,
  issuer: { id: 1, name: "Tooken Lux Prime SCSp" },
  address: {
    street: "5 Rue Eugène Ruppert",
    postal_code: "2453",
    city: "Luxembourg",
    country_code: "LU",
    latitude: "49.585",
    longitude: "6.122",
  },
  specification: { surface_area: 6400.5, build_year: 2021, energy_class: "A" },
  configuration: {
    total_shares: "8000",
    price_per_share: "500",
    currency_code: "EUR",
    yield: 5.2,
    payment_frequency: 4,
    payment_frequency_type_id: 5,
    max_shares_per_investor: "400",
    total_valuation: "4000000",
    entry_fee_rate: "2.5",
    compartment_ref: "C-01",
    min_investment: "1000",
    max_investment: "200000",
  },
  media: [
    {
      id: 2,
      url: "https://img.example/b.jpg",
      alt_text: "Lobby",
      position: 1,
      is_cover: true,
    },
    { id: 1, url: "https://img.example/a.jpg", position: 0, is_cover: false },
  ],
};

describe("buildCreatePayload", () => {
  it("builds a typed payload with decimal strings and integer ids", () => {
    const p = buildCreatePayload(gasperich());
    expect(p).toEqual({
      title: "Gasperich Office Park",
      description: "Grade A offices.",
      imageurl: "https://img.example/b.jpg",
      estate_type_id: 2,
      issuer_id: 1,
      address: {
        street: "5 Rue Eugène Ruppert",
        postal_code: "2453",
        city: "Luxembourg",
        country_code: "LU",
        latitude: "49.585",
        longitude: "6.122",
      },
      specification: {
        surface_area: "6400.5",
        build_year: 2021,
        energy_class: "A",
      },
      configuration: {
        total_shares: "8000",
        price_per_share: "500",
        currency_code: "EUR",
        yield: "5.2",
        payment_frequency: 4,
        payment_frequency_type_id: 5,
        max_shares_per_investor: "400",
        entry_fee_rate: "2",
      },
      media: [
        {
          url: "https://img.example/a.jpg",
          media_type: "image",
          position: 0,
          is_cover: false,
        },
        {
          url: "https://img.example/b.jpg",
          alt_text: "Lobby",
          media_type: "image",
          position: 1,
          is_cover: true,
        },
      ],
    });
  });

  it("omits blank optional sections and makes the first image the cover", () => {
    const v = gasperich();
    v.specification = emptyAssetValues().specification;
    v.configuration = emptyAssetValues().configuration;
    v.media = [
      { url: "https://img.example/a.jpg", alt_text: "", is_cover: false },
    ];
    const p = buildCreatePayload(v);
    expect(p.specification).toBeUndefined();
    expect(p.configuration).toBeUndefined();
    expect(p.media?.[0].is_cover).toBe(true);
    expect(p.imageurl).toBe("https://img.example/a.jpg");
  });
});

describe("assetToFormValues", () => {
  it("prefills fees, investment limits and compartment returned by the API", () => {
    const v = assetToFormValues(stored);
    expect(v.configuration.entry_fee_rate).toBe("2.5");
    expect(v.configuration.compartment_ref).toBe("C-01");
    expect(v.configuration.min_investment).toBe("1000");
    expect(v.configuration.max_investment).toBe("200000");
    expect(v.configuration.exit_fee_rate).toBe("");
  });
});

describe("buildPatchPayload", () => {
  it("sends nothing when the stored asset is unchanged", () => {
    const initial = assetToFormValues(stored);
    expect(buildPatchPayload(initial, structuredClone(initial))).toEqual({});
  });

  it("sends only the changed fields, per section", () => {
    const initial = assetToFormValues(stored);
    const next = structuredClone(initial);
    next.title = "Gasperich Office Park II";
    next.address.street_complement = "Building B";
    next.address.latitude = "";
    next.specification.bedroom_number = "3";
    next.configuration.price_per_share = "520";
    next.configuration.mgmt_fee_rate = "0.75";
    expect(buildPatchPayload(initial, next)).toEqual({
      title: "Gasperich Office Park II",
      address: { street_complement: "Building B", latitude: "" },
      specification: { bedroom_number: 3 },
      configuration: { price_per_share: "520", mgmt_fee_rate: "0.75" },
    });
  });

  it("replaces the whole gallery and the cover when media change", () => {
    const initial = assetToFormValues(stored);
    const next = structuredClone(initial);
    next.media = [
      { url: "https://img.example/c.jpg", alt_text: "", is_cover: true },
      ...next.media.map((m) => ({ ...m, is_cover: false })),
    ];
    const patch = buildPatchPayload(initial, next);
    expect(patch.media?.map((m) => [m.url, m.position, m.is_cover])).toEqual([
      ["https://img.example/c.jpg", 0, true],
      ["https://img.example/a.jpg", 1, false],
      ["https://img.example/b.jpg", 2, false],
    ]);
    expect(patch.imageurl).toBe("https://img.example/c.jpg");
  });
});

describe("assetFormSchema", () => {
  it("requires the core economics once one of them is filled", () => {
    const v = gasperich();
    v.configuration.price_per_share = "";
    v.configuration.payment_frequency_type_id = "";
    const r = assetFormSchema.safeParse(v);
    expect(r.success).toBe(false);
    const paths = r.error?.issues.map((i) => i.path.join("."));
    expect(paths).toContain("configuration.price_per_share");
    expect(paths).toContain("configuration.payment_frequency_type_id");
  });

  it("accepts a draft without economics", () => {
    const v = gasperich();
    v.configuration = emptyAssetValues().configuration;
    expect(assetFormSchema.safeParse(v).success).toBe(true);
  });
});

describe("subscriptionFill", () => {
  const order = (statusCode: string, tokenQuantity: number) =>
    ({ statusCode, tokenQuantity }) as IssuanceOrder;

  it("counts live orders only and splits settled from reserved", () => {
    const fill = subscriptionFill(
      [
        order("CLOSED", 20),
        order("AWAITING_PAYMENT", 13),
        order("CANCELLED", 500),
        order("EXPIRED", 40),
      ],
      "10000",
    );
    expect(fill).toEqual({
      subscribed: 33n,
      settled: 20n,
      reserved: 13n,
      percent: "0.33",
      orderCount: 2,
    });
  });

  it("is zero without shares", () => {
    expect(subscriptionFill([order("CLOSED", 1)], undefined).percent).toBe(
      "0.00",
    );
  });
});

describe("helpers", () => {
  it("computes the valuation exactly", () => {
    expect(computeValuation("8000", "500")).toBe("4000000.00");
    expect(computeValuation("3", "0.1")).toBe("0.30");
    expect(computeValuation("", "500")).toBeNull();
  });
});
