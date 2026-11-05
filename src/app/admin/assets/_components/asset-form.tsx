"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ImageIcon,
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
import { FormField } from "@/components/app/form-field";
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
import { formatMoney } from "@/lib/format";
import {
  COUNTRIES,
  CURRENCIES,
  ENERGY_CLASSES,
  ESTATE_TYPES,
  PAYMENT_FREQUENCY_TYPES,
} from "@/lib/reference";
import { cn } from "@/lib/utils";
import {
  type AssetFormValues,
  assetFormSchema,
  computeValuation,
} from "./asset-payload";

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
  onSubmit: (values: AssetFormValues) => Promise<void> | void;
  submitting?: boolean;
  cancelHref: string;
  /** Shown above the form, e.g. restrictions once the asset is tokenized. */
  notice?: React.ReactNode;
};

export function AssetForm({
  mode,
  defaultValues,
  onSubmit,
  submitting,
  cancelHref,
  notice,
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

  const [shares, price, currency] = useWatch({
    control,
    name: [
      "configuration.total_shares",
      "configuration.price_per_share",
      "configuration.currency_code",
    ],
  });
  const valuation = computeValuation(shares ?? "", price ?? "");

  const sectionHasError = (keys: readonly string[]) =>
    keys.some((k) => k in errors);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]"
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
            {valuation ? formatMoney(valuation, currency || "EUR") : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Shares × price per share
          </p>
        </div>
      </nav>

      <div className="min-w-0 space-y-6">
        {notice}
        {Object.keys(errors).length > 0 ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Some fields need your attention</AlertTitle>
            <AlertDescription>
              Review the sections flagged in the navigation.
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
              label="Asset name"
              htmlFor="title"
              required
              error={errors.title?.message}
              className="sm:col-span-2"
            >
              <Input
                id="title"
                placeholder="e.g. Gasperich Office Park"
                aria-invalid={!!errors.title}
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
                options={ESTATE_TYPES.map((t) => ({
                  value: String(t.id),
                  label: t.label,
                }))}
              />
            </FormField>
            <IssuerSelect control={control} error={errors.issuer_id?.message} />
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
                  options={ENERGY_CLASSES.map((c) => ({ value: c, label: c }))}
                />
              </FormField>
              <FormField label="GHG class" htmlFor="ges_class">
                <SelectControl
                  control={control}
                  name="specification.ges_class"
                  id="ges_class"
                  placeholder="—"
                  allowNone
                  options={ENERGY_CLASSES.map((c) => ({ value: c, label: c }))}
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
                  {valuation ? formatMoney(valuation, currency || "EUR") : "—"}
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
                error={errors.configuration?.payment_frequency_type_id?.message}
              >
                <SelectControl
                  control={control}
                  name="configuration.payment_frequency_type_id"
                  id="payment_frequency_type_id"
                  placeholder="Select a period"
                  invalid={!!errors.configuration?.payment_frequency_type_id}
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
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Investment limits & fees
              </h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <NumberInput
                  form={form}
                  name="configuration.min_investment"
                  label="Minimum investment"
                  suffix={currency || "EUR"}
                  decimal
                />
                <NumberInput
                  form={form}
                  name="configuration.max_investment"
                  label="Maximum investment"
                  suffix={currency || "EUR"}
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
            </div>
          </PanelBody>
        </Panel>

        <MediaSection form={form} />

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:mx-0 lg:rounded-lg lg:border lg:bg-card lg:px-5">
          <p className="text-xs text-muted-foreground">
            {mode === "create"
              ? "The asset is saved as a draft. Publishing deploys its token."
              : isDirty
                ? "Only modified fields are sent."
                : "No changes yet."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={cancelHref}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting || (mode === "edit" && !isDirty)}
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
}: {
  form: Form;
  name: FieldPath<AssetFormValues>;
  label: string;
  suffix?: string;
  placeholder?: string;
  decimal?: boolean;
}) {
  const id = name.replace(/\./g, "-");
  const error = getError(form.formState.errors, name);
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <div className="relative">
        <Input
          id={id}
          inputMode={decimal ? "decimal" : "numeric"}
          autoComplete="off"
          placeholder={placeholder}
          aria-invalid={!!error}
          className={cn("tabular", suffix && "pr-14")}
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
}: {
  control: Control<AssetFormValues>;
  name: FieldPath<AssetFormValues>;
  id: string;
  placeholder: string;
  options: { value: string; label: string }[];
  invalid?: boolean;
  allowNone?: boolean;
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
              aria-invalid={invalid}
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
}: {
  control: Control<AssetFormValues>;
  error?: string;
}) {
  const issuers = useIssuers();
  const options = (issuers.data ?? [])
    .filter((i) => i.status !== "dissolved")
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
        issuers.isSuccess && options.length === 0 ? (
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
        options={options}
      />
    </FormField>
  );
}

function MediaSection({ form }: { form: Form }) {
  const { control, register, setValue, getValues, formState } = form;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "media",
  });
  const media = useWatch({ control, name: "media" }) ?? [];
  const [draftUrl, setDraftUrl] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const add = () => {
    const url = draftUrl.trim();
    if (!/^https:\/\/\S+$/.test(url)) {
      setDraftError("Enter an https:// image URL");
      return;
    }
    append({ url, alt_text: "", is_cover: fields.length === 0 });
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="media-url" className="sr-only">
              Image URL
            </label>
            <Input
              id="media-url"
              type="url"
              placeholder="https://…"
              value={draftUrl}
              aria-invalid={!!draftError}
              onChange={(e) => setDraftUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            {draftError ? (
              <p className="text-xs text-red-600" role="alert">
                {draftError}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={add}>
            <Plus /> Add image
          </Button>
        </div>
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
              return (
                <li
                  key={f.id}
                  className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row"
                >
                  <div
                    role="img"
                    aria-label={current?.alt_text || `Image ${i + 1}`}
                    className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded bg-muted bg-cover bg-center sm:w-36"
                    style={
                      current?.url
                        ? { backgroundImage: `url("${current.url}")` }
                        : undefined
                    }
                  >
                    {current?.is_cover ? (
                      <span className="absolute left-1.5 top-1.5 rounded bg-ink/85 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                        Cover
                      </span>
                    ) : null}
                  </div>
                  <div className="grid min-w-0 flex-1 gap-2">
                    <div>
                      <label htmlFor={`media-${i}-url`} className="sr-only">
                        Image {i + 1} URL
                      </label>
                      <Input
                        id={`media-${i}-url`}
                        className="font-mono text-xs"
                        aria-invalid={!!urlError}
                        {...register(`media.${i}.url`)}
                      />
                      {urlError ? (
                        <p className="mt-1 text-xs text-red-600" role="alert">
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
                        {...register(`media.${i}.alt_text`)}
                      />
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

/** Tracks which form section is in view to highlight it in the side nav. */
function useActiveSection() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  useEffect(() => {
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
