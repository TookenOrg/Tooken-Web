'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DualRangeSlider } from "@/components/ui/dual-range-slider"
import type { RealEstate } from "@/types/real-estate/RealEstate"

export type FiltersProps = {
    realEstates: RealEstate[]
    onFilterChange: (filtered: RealEstate[]) => void
}

export function RealEstateFilters({ realEstates, onFilterChange }: FiltersProps) {
    const [typeFilter, setTypeFilter] = useState<string | null>(null)
    const [priceRange, setPriceRange] = useState([0, 1000])
    const [yieldRange, setYieldRange] = useState([0.1, 30])

    useEffect(() => {
        let filtered = realEstates || [] // fallback

        if (typeFilter) filtered = filtered.filter(r => r.estate_type === typeFilter)

        filtered = filtered.filter(r =>
            r.configuration.price_per_share >= priceRange[0] &&
            r.configuration.price_per_share <= priceRange[1]
        )

        filtered = filtered.filter(r =>
            r.configuration.yield >= yieldRange[0] &&
            r.configuration.yield <= yieldRange[1]
        )

        onFilterChange(filtered)
    }, [typeFilter, priceRange, yieldRange, realEstates, onFilterChange])

    return (
        <div className="bg-[#1F1D2B] text-white backdrop-blur-lg p-6 rounded-2xl shadow-lg grid grid-cols-1 md:grid-cols-2 gap-6 items-end">

            {/* Type Select */}
            {/* <div className="flex flex-col">
                <label className="text-sm mb-2">Property Type</label>
                <Select onValueChange={setTypeFilter} value={typeFilter ?? ""}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="building">Building</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                    </SelectContent>
                </Select>
            </div> */}

            {/* Price Dual Slider */}
            <div className="flex flex-col">
                <label className="text-sm mb-2">Price per share (€)</label>
                <DualRangeSlider
                    min={0}
                    max={1000}
                    step={10}
                    value={priceRange}
                    rangeColor="amber"
                    trackColor="gray"
                    thumbColor="slate"
                    onValueChange={setPriceRange}
                />
                <div className="flex justify-between text-xs mt-3">
                    <span>{priceRange[0]}€</span>
                    <span>{priceRange[1]}€</span>
                </div>
            </div>

            {/* Yield Dual Slider */}
            <div className="flex flex-col">
                <label className="text-sm mb-2">Yield (%)</label>
                <DualRangeSlider
                    min={0.1}
                    max={30}
                    step={0.1}
                    value={yieldRange}
                    rangeColor="amber"
                    trackColor="gray"
                    thumbColor="slate"
                    onValueChange={setYieldRange}
                />
                <div className="flex justify-between text-xs mt-3">
                    <span>{yieldRange[0]}%</span>
                    <span>{yieldRange[1]}%</span>
                </div>
            </div>

            {/* Reset Button */}
            <div className="md:col-span-3 flex justify-end mt-4">
                <Button
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90 transition-all"
                    onClick={() => {
                        setTypeFilter(null)
                        setPriceRange([0, 1000])
                        setYieldRange([0, 30])
                    }}
                >
                    Reset Filters
                </Button>
            </div>

        </div>
    )
}

export default RealEstateFilters
