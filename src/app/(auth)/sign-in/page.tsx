'use client'

import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/api/auth";
import { Button } from "@/components/ui/button"
import { useState } from "react";
import { useRouter } from "next/navigation";

type SignInFormValues = {
    email: string
    password: string
}

export default function SignInPage() {

    const router = useRouter();

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);


    const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<SignInFormValues>({
        mode: "onChange"
    })

    const onSubmit = async (data: SignInFormValues) => {
        setError(null);
        setIsLoading(true);

        try {
            const res = await signIn({
                email: data.email,
                password: data.password,
            });

            reset();

            router.push("/")

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unexpected error");
            }
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="flex min-h-screen flex-col md:flex-row bg-[#2D2B3D]">
            {/* Partie gauche : branding */}
            <div className="md:w-3/5 w-full flex flex-col items-center justify-center text-white p-12 md:p-16">
                <h1 className="text-5xl font-bold mb-6 text-center md:text-left">Tooken</h1>
                <p className="text-lg max-w-md text-center md:text-left">
                    Connectez-vous pour accéder à votre tableau de bord et gérer vos NFTs Soulbound.
                </p>
                <img
                    src="/logo.png"
                    alt="Tooken Logo"
                    className="mt-10 w-48 md:w-64"
                />
            </div>

            {/* Partie droite : formulaire */}
            <div className="md:w-2/5 w-full flex items-center justify-center p-12 md:p-16 bg-white rounded-tl-[2rem] md:rounded-tl-none md:rounded-l-[2rem]">
                <div className="w-full max-w-md space-y-6">
                    <h2 className="text-3xl font-bold text-gray-800 text-center">Sign In</h2>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                        {/* Email */}
                        <div className="flex flex-col">
                            <Input
                                type="email"
                                placeholder="Email"
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" }
                                })}
                                className={errors.email ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg" : "rounded-lg"}
                            />
                            {errors.email && (
                                <span className="text-red-500 text-sm mt-1">{errors.email.message}</span>
                            )}
                        </div>

                        {/* Password */}
                        <div className="flex flex-col">
                            <Input
                                type="password"
                                placeholder="Password"
                                {...register("password", { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } })}
                                className={errors.password ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg" : "rounded-lg"}
                            />
                            {errors.password && (
                                <span className="text-red-500 text-sm mt-1">{errors.password.message}</span>
                            )}
                        </div>

                        {error && (
                            <p className="text-sm text-red-500 mt-2">
                                {error}
                            </p>
                        )}

                        <Button type="submit" disabled={!isValid || isLoading}>
                            {isLoading ? "Connexion..." : "Sign In"}
                        </Button>
                    </form>

                    <p className="text-sm text-center text-gray-600">
                        Don't have an account? <a href="/sign-up" className="text-blue-600 font-medium">Sign Up</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
