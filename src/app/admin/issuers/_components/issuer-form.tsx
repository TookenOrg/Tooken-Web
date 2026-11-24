"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/app/form-field";
import { TookenLoader } from "@/components/app/tooken-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Issuer,
  IssuerPatchRequest,
  IssuerWriteRequest,
} from "@/lib/api/types";
import { COUNTRIES } from "@/lib/reference";
import { ISSUER_STATUS } from "@/lib/status";

export const LEGAL_FORMS = [
  "SA",
  "SARL",
  "SAS",
  "SCA",
  "SCS",
  "SCSp",
  "SICAV",
  "SIF",
  "RAIF",
  "SICAR",
];

const issuerFieldsSchema = z.object({
  name: z.string().trim().min(2, "Enter the legal name").max(200),
  legal_form: z.string().trim().min(1, "Enter the legal form").max(30),
  registration_number: z.string().trim().max(50),
  country_code: z.string().length(2, "Select a jurisdiction"),
  lei_code: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (v) => v === "" || /^[A-Z0-9]{20}$/.test(v),
      "A LEI is exactly 20 letters or digits",
    ),
  status_id: z.string(),
});

export type IssuerFormValues = z.infer<typeof issuerFieldsSchema>;

function issuerSchema(mode: "create" | "edit", initial: IssuerFormValues) {
  return issuerFieldsSchema.superRefine((v, ctx) => {
    if (
      v.status_id === String(ISSUER_STATUS.active.id) &&
      v.registration_number === "" &&
      (mode === "create" || initial.registration_number.trim() !== "")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["registration_number"],
        message: "Required for an active issuer",
      });
    }
  });
}

export function issuerToFormValues(issuer?: Issuer): IssuerFormValues {
  return {
    name: issuer?.name ?? "",
    legal_form: issuer?.legal_form ?? "",
    registration_number: issuer?.registration_number ?? "",
    country_code: issuer?.country_code ?? "LU",
    lei_code: issuer?.lei_code ?? "",
    status_id: String(issuer?.status_id ?? ISSUER_STATUS.active.id),
  };
}

export function buildIssuerCreate(v: IssuerFormValues): IssuerWriteRequest {
  return {
    name: v.name.trim(),
    legal_form: v.legal_form.trim(),
    country_code: v.country_code,
    ...(v.registration_number.trim()
      ? { registration_number: v.registration_number.trim() }
      : {}),
    ...(v.lei_code.trim() ? { lei_code: v.lei_code.trim().toUpperCase() } : {}),
    status_id: Number(v.status_id),
  };
}

/** Changed fields only; a cleared optional field is sent empty to clear it. */
export function buildIssuerPatch(
  initial: IssuerFormValues,
  v: IssuerFormValues,
): IssuerPatchRequest {
  const patch: IssuerPatchRequest = {};
  const keys = [
    "name",
    "legal_form",
    "registration_number",
    "country_code",
    "lei_code",
  ] as const;
  for (const k of keys) {
    const next = k === "lei_code" ? v[k].trim().toUpperCase() : v[k].trim();
    if (next !== initial[k].trim()) patch[k] = next;
  }
  return patch;
}

export function IssuerForm({
  mode,
  defaultValues,
  onSubmit,
  submitting,
  cancelHref,
  onCancel,
}: {
  mode: "create" | "edit";
  defaultValues: IssuerFormValues;
  onSubmit: (values: IssuerFormValues) => void | Promise<void>;
  submitting?: boolean;
  cancelHref?: string;
  onCancel?: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<IssuerFormValues>({
    resolver: zodResolver(issuerSchema(mode, defaultValues)),
    defaultValues,
    mode: "onTouched",
  });
  const isActive = watch("status_id") === String(ISSUER_STATUS.active.id);
  const country = watch("country_code");
  const registrationRequired =
    isActive &&
    (mode === "create" || defaultValues.registration_number.trim() !== "");

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Legal name"
          htmlFor="issuer-name"
          required
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <Input
            id="issuer-name"
            placeholder="e.g. Tooken Lux Prime SCSp"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "issuer-name-error" : undefined}
            {...register("name")}
          />
          {errors.name ? (
            <span id="issuer-name-error" className="sr-only">
              {errors.name.message}
            </span>
          ) : null}
        </FormField>
        <FormField
          label="Legal form"
          htmlFor="issuer-legal-form"
          required
          error={errors.legal_form?.message}
          hint="Suggestions are examples; another legal form may be entered."
        >
          <Input
            id="issuer-legal-form"
            list="issuer-legal-forms"
            autoComplete="off"
            aria-invalid={!!errors.legal_form}
            aria-describedby={
              errors.legal_form ? "issuer-legal-form-error" : undefined
            }
            {...register("legal_form")}
          />
          {errors.legal_form ? (
            <span id="issuer-legal-form-error" className="sr-only">
              {errors.legal_form.message}
            </span>
          ) : null}
          <datalist id="issuer-legal-forms">
            {LEGAL_FORMS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </FormField>
        <FormField
          label="Jurisdiction"
          htmlFor="issuer-country"
          required
          error={errors.country_code?.message}
        >
          <Controller
            control={control}
            name="country_code"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="issuer-country"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={!!errors.country_code}
                  aria-describedby={
                    errors.country_code ? "issuer-country-error" : undefined
                  }
                  className="w-full"
                >
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.country_code ? (
            <span id="issuer-country-error" className="sr-only">
              {errors.country_code.message}
            </span>
          ) : null}
        </FormField>
        <FormField
          label="Registration number"
          htmlFor="issuer-rcs"
          required={registrationRequired}
          error={errors.registration_number?.message}
          hint={
            isActive && mode === "edit" && !defaultValues.registration_number
              ? "This older active record can be edited without a number. Add one when available."
              : country === "LU"
                ? "RCS number in Luxembourg. Required for Active and unique within the jurisdiction."
                : "Registration number in the selected jurisdiction. Required for Active and unique within that jurisdiction."
          }
        >
          <Input
            id="issuer-rcs"
            placeholder={country === "LU" ? "B123456" : undefined}
            className="font-mono"
            aria-invalid={!!errors.registration_number}
            aria-describedby={
              errors.registration_number ? "issuer-rcs-error" : undefined
            }
            {...register("registration_number")}
          />
          {errors.registration_number ? (
            <span id="issuer-rcs-error" className="sr-only">
              {errors.registration_number.message}
            </span>
          ) : null}
        </FormField>
        <FormField
          label="LEI code"
          htmlFor="issuer-lei"
          error={errors.lei_code?.message}
          hint="Optional in this form. A LEI has 20 letters or digits."
        >
          <Input
            id="issuer-lei"
            maxLength={20}
            className="font-mono uppercase"
            aria-invalid={!!errors.lei_code}
            aria-describedby={errors.lei_code ? "issuer-lei-error" : undefined}
            {...register("lei_code")}
          />
          {errors.lei_code ? (
            <span id="issuer-lei-error" className="sr-only">
              {errors.lei_code.message}
            </span>
          ) : null}
        </FormField>
      </div>

      {mode === "create" ? (
        <fieldset className="space-y-3">
          <legend className="text-xs font-medium text-ink/80">
            Initial status
          </legend>
          <Controller
            control={control}
            name="status_id"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="grid gap-3 sm:grid-cols-2"
              >
                {[
                  {
                    id: ISSUER_STATUS.active.id,
                    title: "Active",
                    text: "The vehicle exists and is registered. Assets can be published under it.",
                  },
                  {
                    id: ISSUER_STATUS.draft.id,
                    title: "Draft",
                    text: "Still being incorporated. Registration number can be added later.",
                  },
                ].map((o) => (
                  <Label
                    key={o.id}
                    htmlFor={`issuer-status-${o.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 font-normal has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-muted/40"
                  >
                    <RadioGroupItem
                      id={`issuer-status-${o.id}`}
                      value={String(o.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        {o.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {o.text}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            )}
          />
        </fieldset>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : cancelHref ? (
          <Button variant="outline" asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={submitting || (mode === "edit" && !isDirty)}
          className="bg-brand text-brand-foreground hover:bg-brand-light"
        >
          {submitting ? <TookenLoader size={16} /> : null}
          {mode === "create" ? "Create issuer" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
