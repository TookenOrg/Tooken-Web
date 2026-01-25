import type { RealEstate } from "@/types/real-estate/RealEstate"
import { Badge } from "@/components/ui/badge"

type Props = {
    estate: RealEstate
}

export function RealEstateHero({ estate }: Props) {
    return (
        <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {estate.title}
            </h1>

            {/* Key infos – beginner friendly */}
            <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                    Yield {estate.configuration.yield}%
                </Badge>

                <Badge variant="secondary">
                    Payment {estate.configuration.payment_frequency_type}
                </Badge>

                <Badge variant="outline">
                    Tokenized real estate
                </Badge>
            </div>
        </div>
    )
}
