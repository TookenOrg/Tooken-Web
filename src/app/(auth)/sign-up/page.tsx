'use client'

import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type SignUpFormValues = {
    fullName: string
    email: string
    password: string
}

export default function SignUpPage() {
    const { register, handleSubmit, formState: { errors, isValid } } = useForm<SignUpFormValues>({
        mode: "onChange"
    })


    const onSubmit = async (data: SignUpFormValues) => {
        console.log("Sign Up Data:", data);

    };

    return (
        <div className="flex min-h-screen flex-col md:flex-row bg-[#2D2B3D]">
            {/* Partie gauche : branding */}
            <div className="md:w-3/5 w-full flex flex-col items-center justify-center text-white p-12 md:p-16 bg-animated-gradient-dark">
                <h1 className="text-5xl font-bold mb-6 text-center md:text-left">Tooken</h1>
                <p className="text-lg max-w-md text-center md:text-left">
                    Créez votre compte et commencez à gérer vos NFTs Soulbound en toute sécurité.
                </p>
                <img
                    src="/logo-transparent_3000.png"
                    alt="Tooken Logo"
                    className="mt-10 w-48 md:w-64"
                />
            </div>

            {/* Partie droite : formulaire */}
            <div className="md:w-2/5 w-full flex items-center justify-center p-12 md:p-16 bg-white">
                <div className="w-full max-w-md space-y-6">
                    <h2 className="text-3xl font-bold text-gray-800 text-center">Sign Up</h2>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                        {/* Full Name */}
                        <div className="flex flex-col">
                            <Input
                                type="text"
                                placeholder="Full Name"
                                {...register("fullName", { required: "Full name is required" })}
                                className={errors.fullName ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg" : "rounded-lg"}
                            />
                            {errors.fullName && (
                                <span className="text-red-500 text-sm mt-1">{errors.fullName.message}</span>
                            )}
                        </div>

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

                        <Button
                            type="submit"
                            className="w-full mt-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                            disabled={!isValid}
                        >
                            Sign Up
                        </Button>
                    </form>

                    <p className="text-sm text-center text-gray-600">
                        Already have an account? <a href="/sign-in" className="text-blue-600 font-medium">Sign In</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
