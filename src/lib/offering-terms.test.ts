import { describe, expect, it } from "vitest";
import { offeringTerms } from "./offering-terms";

describe("offeringTerms", () => {
  it("lists only the configured terms, formatted", () => {
    expect(
      offeringTerms({
        currency_code: "EUR",
        min_investment: "1000",
        entry_fee_rate: "2.5",
        mgmt_fee_rate: "0.75",
        exit_fee_rate: " ",
        compartment_ref: "C-01",
      }),
    ).toEqual([
      { label: "Minimum investment", value: "€1,000.00" },
      { label: "Entry fee", value: "2.50 %" },
      { label: "Management fee", value: "0.75 % p.a." },
      { label: "Compartment", value: "C-01" },
    ]);
    expect(offeringTerms(undefined)).toEqual([]);
  });
});
