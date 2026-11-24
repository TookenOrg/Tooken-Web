import type { ReactNode } from "react";

export function fieldDescription(
  id: string,
  error?: string,
  hasHint = false,
): string | undefined {
  const ids = [
    hasHint ? `${id}-hint` : undefined,
    error ? `${id}-error` : undefined,
  ].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function FieldMessages({
  id,
  error,
  hint,
}: {
  id: string;
  error?: string;
  hint?: ReactNode;
}) {
  return (
    <>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
