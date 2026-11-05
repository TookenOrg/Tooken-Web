"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/app/form-field";
import { PageLoader, TookenLoader } from "@/components/app/tooken-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { homeFor } from "@/lib/auth/routes";
import { useSession } from "@/lib/auth/session-context";
import {
  AuthShell,
  PASSWORD_MAX_BYTES,
  resolveRedirect,
  utf8Length,
} from "../_components/auth-shell";

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(80, `${label} is too long.`);

const schema = z
  .object({
    firstName: name("First name"),
    lastName: name("Last name"),
    email: z.email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .refine((v) => utf8Length(v) <= PASSWORD_MAX_BYTES, {
        message: `At most ${PASSWORD_MAX_BYTES} bytes (accented letters count double).`,
      }),
    confirmPassword: z.string().min(1, "Confirm your password."),
    terms: z.boolean().refine((v) => v, {
      message: "You must accept the terms to continue.",
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type Values = z.infer<typeof schema>;

function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return {
    score,
    label: ["Too short", "Weak", "Fair", "Good", "Strong"][score],
  };
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const password = watch("password");
  const strength = passwordStrength(password ?? "");

  const onSubmit = async (values: Values) => {
    setError(null);
    try {
      const user = await signUp({
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      router.replace(
        resolveRedirect(searchParams.get("callbackUrl"), homeFor(user.role)),
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const callbackUrl = searchParams.get("callbackUrl");
  const signInHref = callbackUrl
    ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/sign-in";

  return (
    <>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            htmlFor="firstName"
            error={errors.firstName?.message}
            required
          >
            <Input
              id="firstName"
              autoComplete="given-name"
              aria-invalid={!!errors.firstName}
              {...register("firstName")}
            />
          </FormField>
          <FormField
            label="Last name"
            htmlFor="lastName"
            error={errors.lastName?.message}
            required
          >
            <Input
              id="lastName"
              autoComplete="family-name"
              aria-invalid={!!errors.lastName}
              {...register("lastName")}
            />
          </FormField>
        </div>

        <FormField
          label="Email address"
          htmlFor="email"
          error={errors.email?.message}
          required
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@institution.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          required
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby="password-strength"
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {password ? (
            <div
              id="password-strength"
              className="flex items-center gap-2 pt-1"
              aria-live="polite"
            >
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={
                      i <= strength.score
                        ? strength.score >= 3
                          ? "h-1 flex-1 rounded-full bg-emerald-500"
                          : "h-1 flex-1 rounded-full bg-amber-500"
                        : "h-1 flex-1 rounded-full bg-muted"
                    }
                  />
                ))}
              </div>
              <span className="w-16 text-right text-[11px] text-muted-foreground">
                {strength.label}
              </span>
            </div>
          ) : null}
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </FormField>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-start gap-2.5">
            <Controller
              control={control}
              name="terms"
              render={({ field }) => (
                <Checkbox
                  id="terms"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  onBlur={field.onBlur}
                  aria-invalid={!!errors.terms}
                  className="mt-0.5"
                />
              )}
            />
            <label
              htmlFor="terms"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              I accept the Terms of Use and the Privacy Notice, and I
              acknowledge that subscriptions require identity verification (KYC)
              before any investment.
            </label>
          </div>
          {errors.terms ? (
            <p className="text-xs text-red-600" role="alert">
              {errors.terms.message}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="h-10 w-full bg-brand text-brand-foreground hover:bg-brand-light"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <TookenLoader size={16} /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={signInHref}
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function SignUpPage() {
  return (
    <AuthShell
      title="Open an investor account"
      subtitle="Create your access, then complete identity verification to subscribe to offerings."
    >
      <Suspense fallback={<PageLoader className="min-h-64" />}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
