export type OrderIntent = {
  key: string;
  quantity: number;
  submitted: boolean;
  orderRef?: string;
};

type OrderIntentRead =
  | { status: "ready"; intent: OrderIntent | null; legacy: OrderIntent | null }
  | { status: "unavailable" | "invalid" };

const scopedKey = (userId: number, estateId: number) =>
  `tooken:order-intent:${userId}:${estateId}`;
const legacyKey = (estateId: number) => `tooken:order-intent:${estateId}`;
const validId = (id: number) => Number.isSafeInteger(id) && id > 0;

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function toIntent(value: unknown, legacy: boolean): OrderIntent | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (!Object.hasOwn(record, "key") || !Object.hasOwn(record, "quantity")) {
    return undefined;
  }
  const { key, quantity } = record;
  const submitted = Object.hasOwn(record, "submitted")
    ? record.submitted
    : undefined;
  const orderRef = Object.hasOwn(record, "orderRef")
    ? record.orderRef
    : undefined;
  if (
    typeof key !== "string" ||
    key.trim().length === 0 ||
    typeof quantity !== "number" ||
    !Number.isSafeInteger(quantity) ||
    quantity <= 0 ||
    (typeof submitted !== "boolean" && !(legacy && submitted === undefined)) ||
    (orderRef !== undefined &&
      (typeof orderRef !== "string" || orderRef.trim().length === 0))
  ) {
    return undefined;
  }

  return {
    key,
    quantity,
    submitted: typeof submitted === "boolean" ? submitted : true,
    ...(typeof orderRef === "string" ? { orderRef } : {}),
  };
}

function parseIntent(
  raw: string | null,
  legacy: boolean,
): OrderIntent | null | undefined {
  if (raw === null) return null;
  try {
    return toIntent(JSON.parse(raw), legacy);
  } catch {
    return undefined;
  }
}

export function readOrderIntent(
  userId: number,
  estateId: number,
): OrderIntentRead {
  if (!validId(userId) || !validId(estateId)) return { status: "invalid" };

  const storage = getStorage();
  if (!storage) return { status: "unavailable" };

  try {
    const intent = parseIntent(
      storage.getItem(scopedKey(userId, estateId)),
      false,
    );
    const legacy = parseIntent(storage.getItem(legacyKey(estateId)), true);
    if (intent === undefined || legacy === undefined) {
      return { status: "invalid" };
    }
    return { status: "ready", intent, legacy };
  } catch {
    return { status: "unavailable" };
  }
}

export function saveOrderIntent(
  userId: number,
  estateId: number,
  intent: OrderIntent,
): boolean {
  if (!validId(userId) || !validId(estateId)) return false;

  const storage = getStorage();
  if (!storage) return false;

  try {
    const validated = toIntent(intent, false);
    if (!validated) return false;

    const key = scopedKey(userId, estateId);
    if (parseIntent(storage.getItem(key), false) === undefined) return false;

    const serialized = JSON.stringify(validated);
    storage.setItem(key, serialized);
    return storage.getItem(key) === serialized;
  } catch {
    return false;
  }
}

function clearStoredIntent(storageKey: string): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.removeItem(storageKey);
    return storage.getItem(storageKey) === null;
  } catch {
    return false;
  }
}

export function clearOrderIntent(userId: number, estateId: number): boolean {
  if (!validId(userId) || !validId(estateId)) return false;
  return clearStoredIntent(scopedKey(userId, estateId));
}

export function clearLegacyOrderIntent(estateId: number): boolean {
  if (!validId(estateId)) return false;
  return clearStoredIntent(legacyKey(estateId));
}
