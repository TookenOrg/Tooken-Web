import { expect, it } from "vitest";
import { parseIssuerContext } from "./issuer-context";

it("accepts only a single positive safe integer issuer identifier", () => {
  expect(parseIssuerContext([])).toEqual({ kind: "none" });
  expect(parseIssuerContext(["42"])).toEqual({ kind: "id", id: 42 });
  for (const values of [
    [""],
    ["0"],
    ["-1"],
    ["1.5"],
    ["01"],
    ["1", "2"],
    ["9007199254740992"],
  ]) {
    expect(parseIssuerContext(values)).toEqual({ kind: "invalid" });
  }
});
