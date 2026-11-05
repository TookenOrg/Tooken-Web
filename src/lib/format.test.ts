import { describe, expect, it } from "vitest";
import {
  addDecimal,
  compareDecimal,
  formatFrequency,
  formatMoney,
  multiplyDecimal,
  parseDecimal,
  percentOf,
  remainingShares,
  shortenHash,
} from "./format";

describe("exact decimal arithmetic", () => {
  it("multiplies backend decimal strings without float drift", () => {
    expect(multiplyDecimal("250.00000000", 20)).toBe("5000.00");
    expect(multiplyDecimal("0.1", "0.2", 4)).toBe("0.0200");
    expect(multiplyDecimal("19.99", 3)).toBe("59.97");
  });

  it("rounds half-up at the requested scale", () => {
    expect(multiplyDecimal("1.005", 1, 2)).toBe("1.01");
    expect(multiplyDecimal("-1.005", 1, 2)).toBe("-1.01");
  });

  it("adds values with different scales", () => {
    expect(addDecimal("0.1", "0.2")).toBe("0.30");
    expect(addDecimal("5000.00000000", "100")).toBe("5100.00");
    expect(addDecimal("-2.5", "1")).toBe("-1.50");
  });

  it("computes fees as amount × rate / 100", () => {
    expect(percentOf("5000", "2")).toBe("100.00");
    expect(percentOf("333.33", "1.5")).toBe("5.00");
  });

  it("compares decimals exactly", () => {
    expect(compareDecimal("1.10", "1.1")).toBe(0);
    expect(compareDecimal("10", "9.999")).toBe(1);
    expect(compareDecimal("-1", "0")).toBe(-1);
  });

  it("rejects malformed input", () => {
    expect(() => parseDecimal("1e5")).toThrow();
    expect(() => parseDecimal("abc")).toThrow();
  });

  it("computes remaining shares and never goes negative", () => {
    expect(remainingShares("10000.00000000", 20)).toBe(9980);
    expect(remainingShares("10", 50)).toBe(0);
    expect(remainingShares(null, 1)).toBe(0);
  });
});

describe("display helpers", () => {
  it("formats money in en-GB with a dash for missing values", () => {
    expect(formatMoney("5100.00000000", "EUR")).toBe("€5,100.00");
    expect(formatMoney(null)).toBe("—");
  });

  it("shortens long hashes only", () => {
    expect(shortenHash("0x0059acCa9E938a97158c9676d776BCFc1f717bfA")).toBe(
      "0x0059ac…717bfA",
    );
    expect(shortenHash("0x1234")).toBe("0x1234");
    expect(shortenHash(undefined)).toBe("—");
  });

  it("describes payment frequencies", () => {
    expect(formatFrequency(4, "YEAR")).toBe("Quarterly");
    expect(formatFrequency(1, "month")).toBe("Monthly");
    expect(formatFrequency(1, "unknown")).toBe("—");
  });
});
