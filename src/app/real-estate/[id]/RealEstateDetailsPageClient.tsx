'use client'

import { useState, useEffect } from 'react'
import type { RealEstate } from '@/types/real-estate/RealEstate'
import { getRealEstateById } from '@/lib/api/real-estate/real-estate'
import { Skeleton } from '@/components/ui/skeleton'

import { RealEstateHero } from "@/components/real-estate/details/RealEstateHero"
import { RealEstateMedia } from "@/components/real-estate/details/RealEstateMedia"
import { RealEstateProgress } from "@/components/real-estate/details/RealEstateProgress"
import { RealEstatePurchaseCard } from "@/components/real-estate/details/RealEstatePurchaseCard"
import { RealEstateDescription } from "@/components/real-estate/details/RealEstateDescription"
import { RealEstateInvestmentChart } from '@/components/real-estate/details/RealEstateInvestmentChart'




type Props = { id: string }

export default function RealEstateDetailsPageClient({ id }: Props) {
    const [estate, setEstate] = useState<RealEstate | null>(null)
    const [loading, setLoading] = useState(true)

    // Fade effect
    const [fadePhase, setFadePhase] = useState<'loading' | 'fading' | 'done'>('loading')


    useEffect(() => {
        async function fetchEstate() {
            try {
                const data = await getRealEstateById(id)
                setEstate(data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
                setTimeout(() => setFadePhase('done'), 10)
            }
        }
        fetchEstate()
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen px-6 py-20 max-w-5xl mx-auto space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-4 w-full" />
            </div>
        )
    }

    if (!estate) {
        return (
            <div className="min-h-screen px-6 py-20 max-w-5xl mx-auto text-gray-500">
                Estate not found
            </div>
        )
    }

    return (
        <div className="px-4 sm:px-6 py-16 max-w-7xl mx-auto">
            <div
                className={`transition-opacity duration-700 ${fadePhase === 'loading' ? 'opacity-0' : 'opacity-100'
                    }`}
            >
                {/* HERO */}
                <section className="mb-10">
                    <RealEstateHero estate={estate} />
                </section>

                {/* MAIN GRID */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Media */}
                        <RealEstateMedia estate={estate} />

                        {/* Progress */}
                        <RealEstateProgress estate={estate} />

                        {/* Description */}
                        <RealEstateDescription estate={estate} />

                        <RealEstateInvestmentChart estate={estate} />
                    </div>

                    {/* RIGHT COLUMN */}
                    <aside className="lg:col-span-1">
                        <div className="lg:sticky lg:top-24">
                            {/* Purchase card */}
                            <RealEstatePurchaseCard estate={estate} />
                        </div>
                    </aside>
                </section>
            </div>
        </div>
    )

}
