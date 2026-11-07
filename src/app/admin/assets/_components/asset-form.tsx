"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ImageIcon,
  LockKeyhole,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type Control,
  Controller,
  type FieldErrors,
  type FieldPath,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { FormField as SharedFormField } from "@/components/app/form-field";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { TookenLoader } from "@/components/app/tooken-loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useIssuers } from "@/lib/api/hooks";
import type { Issuer } from "@/lib/api/types";
import { formatFrequency, formatRecordedMoney } from "@/lib/format";
import {
  COUNTRIES,
  CURRENCIES,
  ENERGY_CLASSES,
  ESTATE_TYPES,
  PAYMENT_FREQUENCY_TYPES,
} from "@/lib/reference";
import { cn } from "@/lib/utils";
import type { AssetFieldLocks } from "./asset-locks";
import {
  type AssetFormValues,
  assetFormSchema,
  computeValuation,
} from "./asset-payload";
import { useUnsavedAsset } from "./use-unsaved-asset";

const SECTIONS = [
  {
    id: "general",
    label: "General",
    keys: ["title", "description", "estate_type_id", "issuer_id"],
  },
  { id: "address", label: "Address", keys: ["address"] },
  { id: "specification", label: "Specification", keys: ["specification"] },
  { id: "configuration", label: "Economics", keys: ["configuration"] },
  { id: "media", label: "Media", keys: ["media"] },
] as const;

const NONE = "__none";

type Props = {
  mode: "create" | "edit";
  defaultValues: AssetFormValues;
  onSubmit: (values: AssetFormValues) => Promise<string | undefined>;
  submitting?: boolean;
  cancelHref: string;
  /** Shown above the form, e.g. restrictions once the asset is tokenized. */
  notice?: React.ReactNode;
  locks?: AssetFieldLocks;
  contextIssuer?: Issuer;
};

export function AssetForm({
  mode,
  defaultValues,
  onSubmit,
  submitting,
  cancelHref,
  notice,
  locks = {},
  contextIssuer,
}: Props) {
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;
  const active = useActiveSection();
  const [draftUrl, setDraftUrl] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const watched = useWatch({ control });
  const meaningfulDirty =
    (isDirty && normalizeValues(watched) !== normalizeValues(defaultValues)) ||
    draftUrl.trim() !== "";
  const navigate = useUnsavedAsset(meaningfulDirty);

  const [shares, price, currency] = useWatch({
    control,
    name: [
      "configuration.total_shares",
      "configuration.price_per_share",
      "configuration.currency_code",
    ],
  });
  const valuation = computeValuation(shares ?? "", price ?? "");
  const frequency = watched.configuration?.payment_frequency ?? "";
  const period = PAYMENT_FREQUENCY_TYPES.find(
    (item) =>
      String(item.id) === watched.configuration?.payment_frequency_type_id,
  );
  const frequencyNumber =
    /^[1-9]\d*$/.test(frequency) && Number.isSafeInteger(Number(frequency))
      ? Number(frequency)
      : undefined;
  const distribution = frequencyNumber
    ? formatFrequency(frequencyNumber, period?.code)
    : "—";

  const sectionHasError = (keys: readonly string[]) =>
    keys.some((k) => k in errors || (k === "media" && !!draftError));
  const errorItems = collectErrors(errors);
  if (draftError) {
    errorItems.push({
      id: "media-url",
      label: "Image URL",
      message: draftError,
    });
  }

  const invalid = (fieldErrors: FieldErrors<AssetFormValues>) => {
    const items = collectErrors(fieldErrors);
    if (draftUrl.trim()) {
      setDraftError("Add this image or clear the URL before saving.");
    }
    focusField(items[0]?.id ?? (draftUrl.trim() ? "media-url" : undefined));
  };

  const submit = async (values: AssetFormValues) => {
    if (draftUrl.trim()) {
      setDraftError("Add this image or clear the URL before saving.");
      focusField("media-url");
      return;
    }
    const href = await onSubmit(values);
    if (href) navigate(href);
  };

  return (
    <form
      onSubmit={handleSubmit(submit, invalid)}
      noValidate
      className="grid gap-6 [&_input]:scroll-mb-40 [&_textarea]:scroll-mb-40 [&_button[role=combobox]]:scroll-mb-40 lg:grid-cols-[200px_minmax(0,1fr)]"
    >
      <nav
        aria-label="Form sections"
        className="sticky top-16 z-20 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0"
      >
        <ol className="flex gap-1 lg:flex-col">
          {SECTIONS.map((s, i) => {
            const hasError = sectionHasError(s.keys);
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={active === s.id ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                    active === s.id
                      ? "bg-card font-medium text-ink shadow-sm ring-1 ring-border"
                      : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] tabular",
                      hasError
                        ? "bg-red-100 text-red-700"
                        : active === s.id
                          ? "bg-ink text-white"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {hasError ? "!" : i + 1}
                  </span>
                  {s.label}
                </a>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 hidden rounded-lg border border-border bg-card p-4 lg:block">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total valuation
          </p>
          <p className="mt-1 text-lg font-semibold text-ink tabular">
            {valuation ? formatRecordedMoney(valuation, currency) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Shares × price per share
          </p>
        </div>
      </nav>

      <div className="min-w-0 overflow-hidden">
        <section
          aria-label="Asset form fields"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll the form region.
          tabIndex={0}
          className="relative max-h-[max(16rem,calc(100dvh-21rem))] space-y-6 overflow-y-auto overscroll-contain pb-6 pr-2"
        >
          {notice}
          <p className="text-sm text-muted-foreground">
            Required to save a draft: name, type, issuer and postal address.
            Before publication: a description, a visual, share economics and an
            active issuer are required. If you enter economics, the core share
            configuration must be provided together. The server checks the
            stored asset.
          </p>
          {errorItems.length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Some fields need your attention</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-5">
                  {errorItems.map((item) => (
                    <li key={`${item.id}-${item.message}`}>
                      <a
                        href={`#${item.id}`}
                        className="underline"
                        onClick={(event) => {
                          event.preventDefault();
                          focusField(item.id);
                        }}
                      >
                        {item.label}: {item.message}
                      </a>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <Panel id="general" className="scroll-mt-36 lg:scroll-mt-24">
            <PanelHeader
              title="General information"
              description="How the offering is presented to investors."
            />
            <PanelBody className="grid gap-5 sm:grid-cols-2">
              <FormField
                label={
                  <span className="inline-flex items-center gap-1">
                    Asset name{" "}
                    {locks.title ? (
                      <LockKeyhole className="size-3" aria-hidden />
                    ) : null}
                  </span>
                }
                htmlFor="title"
                required
                error={errors.title?.message}
                hint={locks.title}
                className="sm:col-span-2"
              >
                <Input
                  id="title"
                  placeholder="e.g. Gasperich Office Park"
                  aria-invalid={!!errors.title}
                  aria-describedby={fieldDescription(
                    "title",
                    errors.title?.message,
                    locks.title,
                  )}
                  readOnly={!!locks.title}
                  {...register("title")}
                />
              </FormField>
              <FormField
                label="Asset type"
                htmlFor="estate_type_id"
                required
                error={errors.estate_type_id?.message}
              >
                <SelectControl
                  control={control}
                  name="estate_type_id"
                  id="estate_type_id"
                  placeholder="Select a type"
                  invalid={!!errors.estate_type_id}
                  describedBy={fieldDescription(
                    "estate_type_id",
                    errors.estate_type_id?.message,
                  )}
                  options={ESTATE_TYPES.map((t) => ({
                    value: String(t.id),
                    label: t.label,
                  }))}
                />
              </FormField>
              <IssuerSelect
                control={control}
                error={errors.issuer_id?.message}
                contextIssuer={contextIssuer}
              />
              <FormField
                label="Description"
                htmlFor="description"
                error={errors.description?.message}
                hint="Required before publication. Investment thesis, tenants, location highlights."
                className="sm:col-span-2"
              >
                <Textarea
                  id="description"
                  rows={5}
                  aria-invalid={!!errors.description}
                  aria-describedby={fieldDescription(
                    "description",
                    errors.description?.message,
                  )}
                  {...register("description")}
                />
              </FormField>
            </PanelBody>
          </Panel>

          <Panel id="address" className="scroll-mt-36 lg:scroll-mt-24">
            <PanelHeader
              title="Address"
              description="Only visible to staff. Investors see the city and country."
            />
            <PanelBody className="grid gap-5 sm:grid-cols-6">
              <FormField
                label="Street"
                htmlFor="street"
                required
                error={errors.address?.street?.message}
                className="sm:col-span-4"
              >
                <Input
                  id="street"
                  autoComplete="off"
                  aria-invalid={!!errors.address?.street}
                  aria-describedby={fieldDescription(
                    "street",
                    errors.address?.street?.message,
                  )}
                  {...register("address.street")}
                />
              </FormField>
              <FormField
                label="Complement"
                htmlFor="street_complement"
                className="sm:col-span-2"
              >
                <Input
                  id="street_complement"
                  {...register("address.street_complement")}
                />
              </FormField>
              <FormField
                label="Postal code"
                htmlFor="postal_code"
                required
                error={errors.address?.postal_code?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="postal_code"
                  aria-invalid={!!errors.address?.postal_code}
                  aria-describedby={fieldDescription(
                    "postal_code",
                    errors.address?.postal_code?.message,
                  )}
                  {...register("address.postal_code")}
                />
              </FormField>
              <FormField
                label="City"
                htmlFor="city"
                required
                error={errors.address?.city?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="city"
                  aria-invalid={!!errors.address?.city}
                  aria-describedby={fieldDescription(
                    "city",
                    errors.address?.city?.message,
                  )}
                  {...register("address.city")}
                />
              </FormField>
              <FormField
                label="Region"
                htmlFor="region"
                className="sm:col-span-2"
              >
                <Input id="region" {...register("address.region")} />
              </FormField>
              <FormField
                label="Country"
                htmlFor="country_code"
                required
                error={errors.address?.country_code?.message}
                className="sm:col-span-2"
              >
                <SelectControl
                  control={control}
                  name="address.country_code"
                  id="country_code"
                  placeholder="Select a country"
                  invalid={!!errors.address?.country_code}
                  describedBy={fieldDescription(
                    "country_code",
                    errors.address?.country_code?.message,
                  )}
                  options={COUNTRIES.map((c) => ({
                    value: c.code,
                    label: c.name,
                  }))}
                />
              </FormField>
              <FormField
                label="Latitude"
                htmlFor="latitude"
                error={errors.address?.latitude?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="latitude"
                  inputMode="decimal"
                  placeholder="49.611622"
                  className="tabular"
                  aria-invalid={!!errors.address?.latitude}
                  aria-describedby={fieldDescription(
                    "latitude",
                    errors.address?.latitude?.message,
                  )}
                  {...register("address.latitude")}
                />
              </FormField>
              <FormField
                label="Longitude"
                htmlFor="longitude"
                error={errors.address?.longitude?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="longitude"
                  inputMode="decimal"
                  placeholder="6.131935"
                  className="tabular"
                  aria-invalid={!!errors.address?.longitude}
                  aria-describedby={fieldDescription(
                    "longitude",
                    errors.address?.longitude?.message,
                  )}
                  {...register("address.longitude")}
                />
              </FormField>
            </PanelBody>
          </Panel>

          <Panel id="specification" className="scroll-mt-36 lg:scroll-mt-24">
            <PanelHeader
              title="Specification"
              description="Physical characteristics of the property."
            />
            <PanelBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <NumberInput
                form={form}
                name="specification.surface_area"
                label="Surface area"
                suffix="m²"
                decimal
              />
              <NumberInput
                form={form}
                name="specification.lot_size"
                label="Lot size"
                suffix="m²"
                decimal
              />
              <NumberInput
                form={form}
                name="specification.terrace_size"
                label="Terrace"
                suffix="m²"
                decimal
              />
              <NumberInput
                form={form}
                name="specification.pool_size"
                label="Pool"
                suffix="m²"
                decimal
              />
              <NumberInput
                form={form}
                name="specification.bedroom_number"
                label="Bedrooms"
              />
              <NumberInput
                form={form}
                name="specification.bathroom_number"
                label="Bathrooms"
              />
              <NumberInput
                form={form}
                name="specification.build_year"
                label="Year built"
                placeholder="2021"
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Energy class" htmlFor="energy_class">
                  <SelectControl
                    control={control}
                    name="specification.energy_class"
                    id="energy_class"
                    placeholder="—"
                    allowNone
                    options={ENERGY_CLASSES.map((c) => ({
                      value: c,
                      label: c,
                    }))}
                  />
                </FormField>
                <FormField label="GHG class" htmlFor="ges_class">
                  <SelectControl
                    control={control}
                    name="specification.ges_class"
                    id="ges_class"
                    placeholder="—"
                    allowNone
                    options={ENERGY_CLASSES.map((c) => ({
                      value: c,
                      label: c,
                    }))}
                  />
                </FormField>
              </div>
            </PanelBody>
          </Panel>

          <Panel id="configuration" className="scroll-mt-36 lg:scroll-mt-24">
            <PanelHeader
              title="Economics & share configuration"
              description="Defines the ERC-3643 token deployed at publication. Share count cannot change once tokenized."
            />
            <PanelBody className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <NumberInput
                  form={form}
                  name="configuration.total_shares"
                  label="Total shares"
                  placeholder="8000"
                  locked={locks["configuration.total_shares"]}
                />
                <NumberInput
                  form={form}
                  name="configuration.price_per_share"
                  label="Price per share"
                  placeholder="500"
                  decimal
                />
                <FormField
                  label="Currency"
                  htmlFor="currency_code"
                  error={errors.configuration?.currency_code?.message}
                >
                  <SelectControl
                    control={control}
                    name="configuration.currency_code"
                    id="currency_code"
                    placeholder="Currency"
                    invalid={!!errors.configuration?.currency_code}
                    describedBy={fieldDescription(
                      "currency_code",
                      errors.configuration?.currency_code?.message,
                    )}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                </FormField>
                <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs font-medium text-ink/80">
                    Total valuation
                  </p>
                  <p
                    className="mt-1 text-base font-semibold text-ink tabular"
                    aria-live="polite"
                  >
                    {valuation ? formatRecordedMoney(valuation, currency) : "—"}
                  </p>
                </div>
                <NumberInput
                  form={form}
                  name="configuration.yield"
                  label="Target yield"
                  suffix="% p.a."
                  placeholder="5.2"
                  decimal
                />
                <NumberInput
                  form={form}
                  name="configuration.payment_frequency"
                  label="Distributions per period"
                  placeholder="4"
                />
                <FormField
                  label="Period"
                  htmlFor="payment_frequency_type_id"
                  error={
                    errors.configuration?.payment_frequency_type_id?.message
                  }
                >
                  <SelectControl
                    control={control}
                    name="configuration.payment_frequency_type_id"
                    id="payment_frequency_type_id"
                    placeholder="Select a period"
                    invalid={!!errors.configuration?.payment_frequency_type_id}
                    describedBy={fieldDescription(
                      "payment_frequency_type_id",
                      errors.configuration?.payment_frequency_type_id?.message,
                    )}
                    options={PAYMENT_FREQUENCY_TYPES.map((p) => ({
                      value: String(p.id),
                      label: p.label,
                    }))}
                  />
                </FormField>
                <NumberInput
                  form={form}
                  name="configuration.max_shares_per_investor"
                  label="Max. shares per investor"
                  placeholder="400"
                  locked={locks["configuration.max_shares_per_investor"]}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                Distribution schedule:{" "}
                <strong className="text-ink">{distribution}</strong>. This is a
                configured schedule, not a guarantee of distributions.
              </p>
              <details>
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Advanced: investment limits & fees
                </summary>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <NumberInput
                    form={form}
                    name="configuration.min_investment"
                    label="Minimum investment"
                    suffix={currency || undefined}
                    decimal
                  />
                  <NumberInput
                    form={form}
                    name="configuration.max_investment"
                    label="Maximum investment"
                    suffix={currency || undefined}
                    decimal
                  />
                  <FormField
                    label="Compartment reference"
                    htmlFor="compartment_ref"
                    error={errors.configuration?.compartment_ref?.message}
                    hint="Luxembourg compartment, unique"
                  >
                    <Input
                      id="compartment_ref"
                      aria-invalid={!!errors.configuration?.compartment_ref}
                      aria-describedby={fieldDescription(
                        "compartment_ref",
                        errors.configuration?.compartment_ref?.message,
                      )}
                      {...register("configuration.compartment_ref")}
                    />
                  </FormField>
                  <div className="hidden lg:block" />
                  <NumberInput
                    form={form}
                    name="configuration.entry_fee_rate"
                    label="Entry fee"
                    suffix="%"
                    decimal
                  />
                  <NumberInput
                    form={form}
                    name="configuration.mgmt_fee_rate"
                    label="Management fee"
                    suffix="% p.a."
                    decimal
                  />
                  <NumberInput
                    form={form}
                    name="configuration.exit_fee_rate"
                    label="Exit fee"
                    suffix="%"
                    decimal
                  />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Entered fee rates: entry{" "}
                  {formatEnteredRate(watched.configuration?.entry_fee_rate)},
                  management{" "}
                  {formatEnteredRate(watched.configuration?.mgmt_fee_rate)} per
                  year, exit{" "}
                  {formatEnteredRate(watched.configuration?.exit_fee_rate)}.
                </p>
              </details>
            </PanelBody>
          </Panel>

          <MediaSection
            form={form}
            draftUrl={draftUrl}
            setDraftUrl={setDraftUrl}
            draftError={draftError}
            setDraftError={setDraftError}
          />
        </section>

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:rounded-lg lg:border lg:bg-card lg:px-5">
          <p className="text-xs text-muted-foreground">
            {mode === "create"
              ? "The asset is saved as a draft. Publishing deploys its token."
              : meaningfulDirty
                ? "Your changes are not saved yet."
                : "No changes yet."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={cancelHref}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting || (mode === "edit" && !meaningfulDirty)}
              className="bg-brand text-brand-foreground hover:bg-brand-light"
            >
              {submitting ? <TookenLoader size={16} /> : null}
              {mode === "create" ? "Create draft" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

type Form = ReturnType<typeof useForm<AssetFormValues>>;

function FormField({
  error,
  hint,
  htmlFor,
  children,
  ...props
}: React.ComponentProps<typeof SharedFormField>) {
  return (
    <SharedFormField {...props} htmlFor={htmlFor} error={error} hint={hint}>
      {children}
      {htmlFor && error ? (
        <span id={`${htmlFor}-error`} className="sr-only">
          {error}
        </span>
      ) : null}
      {htmlFor && !error && typeof hint === "string" ? (
        <span id={`${htmlFor}-hint`} className="sr-only">
          {hint}
        </span>
      ) : null}
    </SharedFormField>
  );
}

function fieldDescription(
  id: string,
  error?: string,
  hint?: string,
): string | undefined {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

function normalizeValues(values: unknown): string {
  return JSON.stringify(values, (_, value) =>
    typeof value === "string" ? value.trim() : value,
  );
}

function formatEnteredRate(rate?: string): string {
  return rate?.trim() ? `${rate.trim()}%` : "not set";
}

const FIELD_LABELS: Record<string, [string, string]> = {
  title: ["title", "Asset name"],
  description: ["description", "Description"],
  estate_type_id: ["estate_type_id", "Asset type"],
  issuer_id: ["issuer_id", "Issuer"],
  "address.street": ["street", "Street"],
  "address.street_complement": ["street_complement", "Complement"],
  "address.postal_code": ["postal_code", "Postal code"],
  "address.city": ["city", "City"],
  "address.region": ["region", "Region"],
  "address.country_code": ["country_code", "Country"],
  "address.latitude": ["latitude", "Latitude"],
  "address.longitude": ["longitude", "Longitude"],
  "specification.surface_area": ["specification-surface_area", "Surface area"],
  "specification.lot_size": ["specification-lot_size", "Lot size"],
  "specification.terrace_size": ["specification-terrace_size", "Terrace"],
  "specification.pool_size": ["specification-pool_size", "Pool"],
  "specification.bedroom_number": ["specification-bedroom_number", "Bedrooms"],
  "specification.bathroom_number": [
    "specification-bathroom_number",
    "Bathrooms",
  ],
  "specification.build_year": ["specification-build_year", "Year built"],
  "specification.energy_class": ["energy_class", "Energy class"],
  "specification.ges_class": ["ges_class", "GHG class"],
  "configuration.total_shares": ["configuration-total_shares", "Total shares"],
  "configuration.price_per_share": [
    "configuration-price_per_share",
    "Price per share",
  ],
  "configuration.currency_code": ["currency_code", "Currency"],
  "configuration.yield": ["configuration-yield", "Target yield"],
  "configuration.payment_frequency": [
    "configuration-payment_frequency",
    "Distributions per period",
  ],
  "configuration.payment_frequency_type_id": [
    "payment_frequency_type_id",
    "Period",
  ],
  "configuration.max_shares_per_investor": [
    "configuration-max_shares_per_investor",
    "Max. shares per investor",
  ],
  "configuration.min_investment": [
    "configuration-min_investment",
    "Minimum investment",
  ],
  "configuration.max_investment": [
    "configuration-max_investment",
    "Maximum investment",
  ],
  "configuration.entry_fee_rate": ["configuration-entry_fee_rate", "Entry fee"],
  "configuration.mgmt_fee_rate": [
    "configuration-mgmt_fee_rate",
    "Management fee",
  ],
  "configuration.exit_fee_rate": ["configuration-exit_fee_rate", "Exit fee"],
  "configuration.compartment_ref": ["compartment_ref", "Compartment reference"],
  media: ["media-url", "Media"],
  "media.root": ["media-url", "Media"],
};

function fieldInfo(path: string): [string, string] {
  const media = /^media\.(\d+)\.(url|alt_text)$/.exec(path);
  if (media) {
    const index = Number(media[1]);
    return [
      `media-${index}-${media[2] === "url" ? "url" : "alt"}`,
      `Image ${index + 1} ${media[2] === "url" ? "URL" : "caption"}`,
    ];
  }
  return FIELD_LABELS[path] ?? ["general", path];
}

function collectErrors(
  errors: FieldErrors<AssetFormValues>,
): { id: string; label: string; message: string }[] {
  const items: { id: string; label: string; message: string }[] = [];
  function visit(value: unknown, path: string) {
    if (!value || typeof value !== "object") return;
    const entry = value as Record<string, unknown>;
    if (typeof entry.message === "string") {
      const [id, label] = fieldInfo(path);
      items.push({ id, label, message: entry.message });
    }
    for (const [key, nested] of Object.entries(entry)) {
      if (
        key === "ref" ||
        key === "type" ||
        key === "types" ||
        key === "message"
      ) {
        continue;
      }
      visit(nested, path ? `${path}.${key}` : key);
    }
  }
  visit(errors, "");
  return items;
}

function focusField(id?: string) {
  if (!id) return;
  window.setTimeout(() => {
    const element = document.getElementById(id);
    if (!element) return;
    let parent = element.parentElement;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    element.scrollIntoView?.({ block: "center" });
    element.focus({ preventScroll: true });
  }, 0);
}

function getError(
  errors: FieldErrors<AssetFormValues>,
  name: string,
): string | undefined {
  let cur: unknown = errors;
  for (const part of name.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return (cur as { message?: string } | undefined)?.message;
}

function NumberInput({
  form,
  name,
  label,
  suffix,
  placeholder,
  decimal,
  locked,
}: {
  form: Form;
  name: FieldPath<AssetFormValues>;
  label: string;
  suffix?: string;
  placeholder?: string;
  decimal?: boolean;
  locked?: string;
}) {
  const id = name.replace(/\./g, "-");
  const error = getError(form.formState.errors, name);
  return (
    <FormField
      label={
        <span className="inline-flex items-center gap-1">
          {label}
          {locked ? <LockKeyhole className="size-3" aria-hidden /> : null}
        </span>
      }
      htmlFor={id}
      error={error}
      hint={locked}
    >
      <div className="relative">
        <Input
          id={id}
          inputMode={decimal ? "decimal" : "numeric"}
          autoComplete="off"
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={fieldDescription(id, error, locked)}
          readOnly={!!locked}
          className={cn("tabular", suffix && "pr-14", locked && "bg-muted/40")}
          {...form.register(name)}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </FormField>
  );
}

function SelectControl({
  control,
  name,
  id,
  placeholder,
  options,
  invalid,
  allowNone,
  describedBy,
}: {
  control: Control<AssetFormValues>;
  name: FieldPath<AssetFormValues>;
  id: string;
  placeholder: string;
  options: { value: string; label: string }[];
  invalid?: boolean;
  allowNone?: boolean;
  describedBy?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";
        return (
          <Select
            value={value || (allowNone ? NONE : undefined)}
            onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
          >
            <SelectTrigger
              id={id}
              ref={field.ref}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              onBlur={field.onBlur}
              className="w-full"
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {allowNone ? (
                <SelectItem value={NONE}>Not specified</SelectItem>
              ) : null}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }}
    />
  );
}

function IssuerSelect({
  control,
  error,
  contextIssuer,
}: {
  control: Control<AssetFormValues>;
  error?: string;
  contextIssuer?: Issuer;
}) {
  const issuers = useIssuers();
  const list = issuers.data ?? [];
  const available =
    contextIssuer && !list.some((item) => item.id === contextIssuer.id)
      ? [...list, contextIssuer]
      : list;
  const options = available
    .filter((i) => ["draft", "active", "suspended"].includes(i.status))
    .map((i) => ({
      value: String(i.id),
      label: `${i.name} · ${i.legal_form}${i.status === "active" ? "" : ` (${i.status})`}`,
    }));
  return (
    <FormField
      label="Issuer"
      htmlFor="issuer_id"
      required
      error={error}
      hint={
        issuers.isError ? (
          <>
            Issuers could not be loaded.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => issuers.refetch()}
            >
              Retry
            </button>
            .
          </>
        ) : issuers.isSuccess && options.length === 0 ? (
          <>
            No issuer yet.{" "}
            <Link href="/admin/issuers/new" className="underline">
              Create one
            </Link>
          </>
        ) : (
          "Legal vehicle issuing the shares. Must be active to publish."
        )
      }
    >
      <SelectControl
        control={control}
        name="issuer_id"
        id="issuer_id"
        placeholder={
          issuers.isLoading ? "Loading issuers…" : "Select an issuer"
        }
        invalid={!!error}
        describedBy={fieldDescription("issuer_id", error)}
        options={options}
      />
    </FormField>
  );
}

function MediaSection({
  form,
  draftUrl,
  setDraftUrl,
  draftError,
  setDraftError,
}: {
  form: Form;
  draftUrl: string;
  setDraftUrl: (value: string) => void;
  draftError: string | null;
  setDraftError: (value: string | null) => void;
}) {
  const { control, register, setValue, getValues, formState } = form;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "media",
  });
  const media = useWatch({ control, name: "media" }) ?? [];
  const add = () => {
    const url = draftUrl.trim();
    if (!/^https:\/\/\S+$/.test(url)) {
      setDraftError("Enter an https:// image URL");
      return;
    }
    append({
      url,
      alt_text: "",
      is_cover: fields.length === 0,
      media_type: "image",
    });
    setDraftUrl("");
    setDraftError(null);
  };

  const makeCover = (index: number) => {
    getValues("media").forEach((_, i) => {
      setValue(`media.${i}.is_cover`, i === index, { shouldDirty: true });
    });
  };

  const rootError =
    formState.errors.media?.root?.message ?? formState.errors.media?.message;

  return (
    <Panel id="media" className="scroll-mt-36 lg:scroll-mt-24">
      <PanelHeader
        title="Media"
        description="At least one image is required before publication. The cover is shown in the marketplace."
      />
      <PanelBody className="space-y-4">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Add an image by URL
          </summary>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex-1 space-y-1.5">
              <label
                htmlFor="media-url"
                className="text-xs font-medium text-ink/80"
              >
                Public image URL
              </label>
              <Input
                id="media-url"
                type="url"
                placeholder="https://…"
                value={draftUrl}
                aria-invalid={!!draftError}
                aria-describedby={draftError ? "media-url-error" : undefined}
                onChange={(e) => {
                  setDraftUrl(e.target.value);
                  setDraftError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  }
                }}
              />
              {draftError ? (
                <p
                  id="media-url-error"
                  className="text-xs text-red-600"
                  role="alert"
                >
                  {draftError}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              className="sm:mt-5"
              onClick={add}
            >
              <Plus /> Add image
            </Button>
          </div>
        </details>
        {rootError ? (
          <p className="text-xs text-red-600" role="alert">
            {rootError}
          </p>
        ) : null}

        {fields.length === 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            <ImageIcon className="size-5" aria-hidden />
            No image yet. Paste a public https URL above.
          </div>
        ) : (
          <ul className="space-y-3">
            {fields.map((f, i) => {
              const current = media[i];
              const urlError = formState.errors.media?.[i]?.url?.message;
              const altError = formState.errors.media?.[i]?.alt_text?.message;
              return (
                <li
                  key={f.id}
                  className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row"
                >
                  <ImagePreview
                    key={current?.url}
                    url={current?.url}
                    label={current?.alt_text || `Image ${i + 1}`}
                    cover={!!current?.is_cover}
                  />
                  <div className="grid min-w-0 flex-1 gap-2">
                    <div>
                      <label htmlFor={`media-${i}-url`} className="sr-only">
                        Image {i + 1} URL
                      </label>
                      <Input
                        id={`media-${i}-url`}
                        className="font-mono text-xs"
                        aria-invalid={!!urlError}
                        aria-describedby={
                          urlError ? `media-${i}-url-error` : undefined
                        }
                        {...register(`media.${i}.url`)}
                      />
                      {urlError ? (
                        <p
                          id={`media-${i}-url-error`}
                          className="mt-1 text-xs text-red-600"
                          role="alert"
                        >
                          {urlError}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor={`media-${i}-alt`} className="sr-only">
                        Image {i + 1} caption
                      </label>
                      <Input
                        id={`media-${i}-alt`}
                        placeholder="Caption (alt text)"
                        aria-invalid={!!altError}
                        aria-describedby={
                          altError ? `media-${i}-alt-error` : undefined
                        }
                        {...register(`media.${i}.alt_text`)}
                      />
                      {altError ? (
                        <p
                          id={`media-${i}-alt-error`}
                          className="mt-1 text-xs text-red-600"
                          role="alert"
                        >
                          {altError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start gap-1 sm:flex-col">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Set as cover"
                      aria-pressed={!!current?.is_cover}
                      title="Set as cover"
                      onClick={() => makeCover(i)}
                    >
                      <Star
                        className={cn(
                          current?.is_cover && "fill-brand text-brand",
                        )}
                      />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Move down"
                      disabled={i === fields.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Remove image"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => remove(i)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}

function ImagePreview({
  url,
  label,
  cover,
}: {
  url?: string;
  label: string;
  cover: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative w-full shrink-0 sm:w-36">
      <div className="relative aspect-[3/2] overflow-hidden rounded bg-muted">
        {url && !failed ? (
          // A remote URL is supplied by the operator; no upload or storage is involved.
          // biome-ignore lint/performance/noImgElement: this is a preview of an arbitrary external URL.
          <img
            src={url}
            alt={label}
            className="size-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : null}
        {cover ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-ink/85 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
            Cover
          </span>
        ) : null}
      </div>
      {failed ? (
        <output className="mt-1 block text-xs text-red-600">
          Preview unavailable. Check the image URL.
        </output>
      ) : null}
    </div>
  );
}

/** Tracks which form section is in view to highlight it in the side nav. */
function useActiveSection() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -55% 0px" },
    );
    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return active;
}
