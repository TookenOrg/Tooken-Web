import type { RealEstate } from "@/types/real-estate/RealEstate"
import { Progress } from "@/components/ui/progress"

type Props = {
    estate: RealEstate
}

export function RealEstateProgress({ estate }: Props) {
    const pct = estate.progression.tokens_sold_pctg

    return (
        <div className="rounded-xl border bg-white p-6 space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
                <span>
                    {estate.progression.tokens_sold} /{" "}
                    {estate.configuration.total_shares} tokens sold
                </span>
                <span className="font-medium">{pct}%</span>
            </div>

            <Progress
                value={pct}
                className={`h-2 [&>div]:transition-colors ${pct >= 100
                        ? "[&>div]:bg-green-500"
                        : "[&>div]:bg-amber-500"
                    }`}
            />
        </div>
    )
}
