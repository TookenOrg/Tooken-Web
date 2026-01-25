'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Coins, Building2 } from "lucide-react"
import type { RealEstate } from "@/types/real-estate/RealEstate"
import { Skeleton } from "../ui/skeleton"

type RealEstateCardProps = {
    estate: RealEstate
    onViewDetails?: (
        estate: RealEstate,
        e?: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => void
}

export function RealEstateCard({ estate, onViewDetails }: RealEstateCardProps) {
    const shouldShowImage =
        estate.imageurl &&
        !estate.imageurl.startsWith("https://example.com")

    const getFrequencyLabel = (type: string) => {
        const labels: Record<string, string> = {
            'DAY': 'Daily',
            'MONTH': 'Monthly',
            'YEAR': 'Yearly',
            'WEEK': 'Weekly',
        }
        return labels[type] || type
    }

    return (
        <Card className="
        rounded-2xl
        overflow-hidden
        bg-white/70
        backdrop-blur-xl
        border border-white/40
        shadow-lg
        transition
        cursor-pointer
        hover:shadow-xl
        hover:-translate-y-1
        focus-visible:ring-2
        focus-visible:ring-emerald-500
    "
            role="button"
            tabIndex={0}
            onClick={(e) => onViewDetails?.(estate, e)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault() // empêche le scroll pour Space
                    onViewDetails?.(estate) // pas besoin de passer e
                }
            }}>

            {/* Image / Placeholder */}
            <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center">
                {shouldShowImage ? (
                    <img src={estate.imageurl} alt={estate.title ?? 'Estate'} className="h-full w-full object-cover" />
                ) : (
                    <Building2 className="h-12 w-12 text-gray-400" />
                )}
            </div>

            <CardContent className="p-5 space-y-4">
                <div className="flex justify-between">
                    <Badge className="bg-emerald-100 text-emerald-700 relative hover:bg-default ">
                        {estate.configuration.yield} %
                    </Badge>
                    <Badge className="relative bg-sky-900  hover:bg-default">
                        {getFrequencyLabel(estate.configuration.payment_frequency_type)}
                    </Badge>
                </div>

                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-nowrap">{estate.title}</h3>
                </div>

                <div className="flex items-center text-sm text-gray-500">
                    <Sparkles className="h-4 w-4 mr-2" /> <span className="text-xs mr-2">{estate.configuration.total_shares - estate.progression.tokens_sold} / {estate.configuration.total_shares} remaining tokens</span>
                </div>

                {/* Web3 metrics */}
                {estate.configuration && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Tokens sold</span>
                            <span>{estate.progression.tokens_sold_pctg ?? 0}%</span>
                        </div>
                        <Progress
                            value={estate.progression.tokens_sold_pctg}
                            className={`
                                    h-2
                                    [&>div]:transition-colors
                                    ${estate.progression.tokens_sold_pctg >= 100
                                    ? '[&>div]:bg-green-500'
                                    : '[&>div]:bg-amber-500'}
                            `}
                        />
                    </div>
                )}

                <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                        <Coins className="h-4 w-4" /> Token price
                    </div>
                    <span className="font-semibold">€{estate.configuration.price_per_share}</span>
                </div>
            </CardContent>
        </Card>
    )
}

export function RealEstateListSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-white rounded-2xl shadow-sm p-4 space-y-4"
                >
                    {/* Image */}
                    <Skeleton className="h-48 w-full rounded-xl" />

                    {/* Title */}
                    <Skeleton className="h-5 w-3/4" />

                    {/* Description */}
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />

                    {/* Footer */}
                    <div className="flex justify-between items-center pt-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    )
}


export default RealEstateCard
