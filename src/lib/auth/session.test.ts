import { describe, expect, it } from "vitest";
import { decodeJwt, isExpired } from "./session";

function jwt(payload: object): string {
  const encode = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

describe("decodeJwt", () => {
  it("reads claims, including non-ASCII characters", () => {
    const claims = decodeJwt(
      jwt({
        userId: 3,
        email: "claire@invest.lu",
        role: "USER",
        name: "Clàire",
        exp: 2000000000,
      }),
    );
    expect(claims).toMatchObject({ userId: 3, role: "USER", exp: 2000000000 });
    expect((claims as unknown as { name: string }).name).toBe("Clàire");
  });

  it("returns null for malformed tokens or missing exp", () => {
    expect(decodeJwt(undefined)).toBeNull();
    expect(decodeJwt("not-a-jwt")).toBeNull();
    expect(decodeJwt("a.%%%.c")).toBeNull();
    expect(decodeJwt(jwt({ userId: 1 }))).toBeNull();
  });
});

describe("isExpired", () => {
  const now = 1_000_000_000_000;
  it("applies a safety skew", () => {
    expect(isExpired({ userId: 1, exp: now / 1000 + 10 }, 30, now)).toBe(true);
    expect(isExpired({ userId: 1, exp: now / 1000 + 60 }, 30, now)).toBe(false);
    expect(isExpired(null)).toBe(true);
  });
});
