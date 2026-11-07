"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/app/form-field";
import { PageLoader, TookenLoader } from "@/components/app/tooken-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, defaultMessage } from "@/lib/api/client";
import { homeFor } from "@/lib/auth/routes";
import { useSession } from "@/lib/auth/session-context";
import {
  AuthShell,
  PASSWORD_MAX_BYTES,
  utf8Length,
} from "../_components/auth-shell";
import { safeCallback } from "./safe-callback";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(1, "Password is required.")
    .refine((v) => utf8Length(v) <= PASSWORD_MAX_BYTES, {
      message: `Password must be at most ${PASSWORD_MAX_BYTES} UTF-8 bytes.`,
    }),
});

type Values = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: "Investor", email: "claire@invest.lu", password: "Investor1234!" },
  { label: "Administrator", email: "admin@tooken.io", password: "Admin1234!" },
];

function signInError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Email or password is incorrect. Please try again.";
    }
    if (error.status === 0 || error.status === 429 || error.status >= 500) {
      return defaultMessage(error.status);
    }
    if (error.status >= 400 && error.status < 500) {
      return "Unable to sign in with those details. Please try again.";
    }
  }
  return "Unable to sign in right now. Please try again.";
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: Values) => {
    setError(null);
    try {
      const user = await signIn(values.email.trim(), values.password);
      router.replace(
        safeCallback(searchParams.get("callbackUrl"), homeFor(user.role)),
      );
    } catch (err) {
      setError(signInError(err));
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
    setError(null);
  };

  const signUpHref = searchParams.get("callbackUrl")
    ? `/sign-up?callbackUrl=${encodeURIComponent(searchParams.get("callbackUrl") ?? "")}`
    : "/sign-up";

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <FormField label="Email address" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="email-error" className="text-xs text-red-600" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </FormField>

        <FormField label="Password" htmlFor="password" required>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password
                  ? "password-hint password-error"
                  : "password-hint"
              }
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
          <p id="password-hint" className="text-xs text-muted-foreground">
            Maximum {PASSWORD_MAX_BYTES} UTF-8 bytes; some characters use more
            than one byte.
          </p>
          {errors.password ? (
            <p
              id="password-error"
              className="text-xs text-red-600"
              role="alert"
            >
              {errors.password.message}
            </p>
          ) : null}
        </FormField>

        <Button
          type="submit"
          className="h-10 w-full bg-brand text-brand-foreground hover:bg-brand-light"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <TookenLoader size={16} /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {process.env.PUBLIC_DEMO_MODE === "true" ? (
        <section
          aria-label="Demo accounts"
          className="mt-6 rounded-md border border-dashed border-border bg-muted/40 p-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Demo environment — click to fill
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => fillDemo(a.email, a.password)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <UserRound
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">
                      {a.label}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {a.email}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        New to Tooken?{" "}
        <Link
          href={signUpHref}
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          Open an account
        </Link>
      </p>
    </>
  );
}

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your investor workspace or the issuer back office."
    >
      <Suspense fallback={<PageLoader className="min-h-64" />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
