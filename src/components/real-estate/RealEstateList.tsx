'use client'

import type { RealEstate } from "@/types/real-estate/RealEstate"
import RealEstateCard from "./RealEstateCard"

type RealEstateListProps = {
    realEstates?: RealEstate[]
    onViewDetails?: (estate: RealEstate) => void
}

export default function RealEstateList({ realEstates = [], onViewDetails }: RealEstateListProps) {
    return (
        <div className="max-w-[4*280px] mx-auto">
            {realEstates.length === 0 ? (
                <div className="text-gray-500 text-center py-20">
                    No estates found
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {realEstates.map((estate) => (
                        <RealEstateCard key={estate.id} estate={estate} onViewDetails={onViewDetails} />
                    ))}
                </div>
            )}
        </div>

    )
}
