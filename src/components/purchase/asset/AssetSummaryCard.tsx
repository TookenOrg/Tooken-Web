import Image from 'next/image'
import { RealEstate } from '@/types/real-estate/RealEstate'

type AssetSummaryCardProps = {
    asset: RealEstate
}

export function AssetSummaryCard({ asset }: AssetSummaryCardProps) {
    return (
        <div className="space-y-4">
            {/* Image */}
            <div className="relative w-full h-48 md:h-56 lg:h-64 rounded-lg overflow-hidden bg-gray-100">
                <Image
                    src={asset.imageurl || '/placeholder-real-estate.jpg'}
                    alt={asset.title}
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            {/* Informations */}
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-semibold">
                    {asset.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {asset.created_at} • {asset.estate_type} • {asset.id}
                </p>
            </div>
        </div>
    )
}