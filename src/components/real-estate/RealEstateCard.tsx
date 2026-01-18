'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MapPin, Coins, ArrowRight, Building2 } from "lucide-react"
import type { RealEstate } from "@/types/real-estate/RealEstate"

type RealEstateCardProps = {
    estate: RealEstate
    onViewDetails?: (estate: RealEstate) => void
}

export function RealEstateCard({ estate, onViewDetails }: RealEstateCardProps) {
    const shouldShowImage =
        estate.imageurl &&
        !estate.imageurl.startsWith("https://example.com")

    return (
        <Card className="rounded-2xl overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg hover:shadow-xl transition">
            {/* Image / Placeholder */}
            <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center">
                {shouldShowImage ? (
                    <img src={estate.imageurl} alt={estate.title ?? 'Estate'} className="h-full w-full object-cover" />
                ) : (
                    <Building2 className="h-12 w-12 text-gray-400" />
                )}
            </div>

            <CardContent className="p-5 space-y-4">
                <Badge className="bg-emerald-100 text-emerald-700 relative">
                    {estate.active ? 'Available' : 'Sold'}
                </Badge>

                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{estate.title}</h3>
                </div>

                <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-1" /> {estate.description ?? 'Unknown location'}
                </div>

                {/* Web3 metrics */}
                {estate.configuration && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Tokens sold</span>
                            <span>{estate.progression.tokens_sold ?? 0}%</span>
                        </div>
                        <Progress value={estate.progression.tokens_sold ?? 0} className="h-2" />
                    </div>
                )}

                <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                        <Coins className="h-4 w-4" /> Token price
                    </div>
                    <span className="font-semibold">€{estate.configuration.price_per_share}</span>
                </div>

                <Button
                    className="w-full bg-[#2D2B3D] hover:bg-[#1f1d2e] text-white"
                    onClick={() => onViewDetails?.(estate)}
                >
                    View details <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardContent>
        </Card>
    )
}

export default RealEstateCard
