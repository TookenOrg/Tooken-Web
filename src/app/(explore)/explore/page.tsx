'use client'

import RealEstateFilters from "@/components/real-estate/RealEstateFilters"
import { useState, useEffect } from "react"
import type { RealEstate } from "@/types/real-estate/RealEstate"
import RealEstateList from "@/components/real-estate/RealEstateList"
import { getActiveRealEstate } from "@/lib/api/real-estate/real-estate";

export default function ExplorePage() {
    const [loading, setLoading] = useState(true)
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

    if (loading) return <div>Loading…</div>

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
            <section className=" mx-auto px-6 md:px-0 pb-24">
                <RealEstateList realEstates={filteredEstates} />
            </section>
        </div>
    )


}