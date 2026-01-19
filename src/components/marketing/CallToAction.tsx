'use client'

import { Button } from "@/components/ui/button"
import Link from "next/link";

export function CallToAction() {
    return (
        <section className="relative overflow-hidden py-28 ">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 bg-animated-gradient-amber" />

            {/* Decorative blur shapes */}
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl animate-float-slow" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float-slower" />

            <div className="relative mx-auto max-w-3xl px-6 text-center animate-fade-up">
                <h2 className="text-4xl md:text-5xl font-bold text-[#2D2B3D]">
                    Ready to invest in real estate?
                </h2>

                <p className="mt-6 text-lg text-[#2D2B3D]/80">
                    Join Tooken and discover a compliant, transparent and accessible way
                    to invest in tokenized real estate assets.
                </p>

                <div className="mt-10">
                    <Link href="/sign-up">
                        <Button
                            size="lg"
                            className="rounded-2xl px-10 py-6 text-lg font-semibold text-[#2D2B3D] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl bg-white hover:bg-white"
                        >
                            Create an account
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    )
}
