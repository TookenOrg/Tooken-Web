'use client'

import RealEstateFilters from "@/components/real-estate/RealEstateFilters"
import { useState, useEffect } from "react"
import type { RealEstate } from "@/types/real-estate/RealEstate"
import RealEstateList from "@/components/real-estate/RealEstateList"
import { getActiveRealEstate } from "@/lib/api/real-estate/real-estate";
import { RealEstateListSkeleton } from "@/components/real-estate/RealEstateCard"


export default function ExplorePage() {
    const FADE_DURATION = 700 // ms 
    const [loading, setLoading] = useState(true)

    const [fadePhase, setFadePhase] = useState<
        "loading" | "fading" | "done"
    >("loading")

    const [realEstates, setRealEstates] = useState<RealEstate[]>([])
    const [filteredEstates, setFilteredEstates] = useState<RealEstate[]>([])


    useEffect(() => {
        async function fetchEstates() {
            try {
                const data = await getActiveRealEstate()
                setRealEstates(data)
                setFilteredEstates(data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchEstates()
    }, [])

    useEffect(() => {
        if (!loading) {
            setFadePhase("fading")

            const timeout = setTimeout(() => {
                setFadePhase("done")
            }, FADE_DURATION)

            return () => clearTimeout(timeout)
        }
    }, [loading])




    return (
        <div className="w-[70%] min-h-screen bg-[#F6F7FB] text-gray-900 p-2">
            {/* Hero */}
            <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    Explore tokenized real estate
                </h1>
                <p className="text-gray-600 max-w-2xl">
                    Invest in compliant, fractionalized real estate assets powered by blockchain.
                </p>

                {/* Filtre */}
                <div className="mt-10">
                    <RealEstateFilters realEstates={realEstates} onFilterChange={setFilteredEstates} />
                </div>
            </section>


            {/* Listings */}
            <section className="relative mx-auto px-6 md:px-0 pb-24">
                {/* Skeleton */}
                <div
                    className={`
                        absolute inset-0
                        transition-opacity
                        duration-[700ms]
                        ${fadePhase === "loading"
                            ? "opacity-100"
                            : "opacity-0"
                        }
                    `}
                >
                    <RealEstateListSkeleton />
                </div>

                {/* Contenu */}
                <div
                    className={`
                        transition-opacity
                        duration-[700ms]
                        ${fadePhase === "done"
                            ? "opacity-100"
                            : "opacity-0"
                        }
                    `}
                >
                    <RealEstateList realEstates={filteredEstates} />
                </div>
            </section>
        </div>
    )


}