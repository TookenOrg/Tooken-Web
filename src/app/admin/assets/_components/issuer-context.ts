export type IssuerContext =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "id"; id: number };

export function parseIssuerContext(values: string[]): IssuerContext {
  if (values.length === 0) return { kind: "none" };
  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0])) {
    return { kind: "invalid" };
  }
  const id = Number(values[0]);
  return Number.isSafeInteger(id) ? { kind: "id", id } : { kind: "invalid" };
}
