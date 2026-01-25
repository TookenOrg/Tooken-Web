'use client'

import { Button } from '@/components/ui/button'
import { FavoriteButton } from '@/components/marketing/FavoriteButton'
import { SocialMediaShare } from '@/components/marketing/SocialMediaShare'
import type { RealEstate } from '@/types/real-estate/RealEstate'

type Props = {
    estate: RealEstate
}

export function RealEstatePurchaseCard({ estate }: Props) {
    return (
        <div className="rounded-xl border bg-white p-6 space-y-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <p className="text-sm text-gray-500">Price per share</p>
                    <p className="text-3xl font-bold">€{estate.configuration.price_per_share}</p>
                </div>

                <div className="flex gap-3 mt-1">
                    <FavoriteButton estateId={estate.id} />
                </div>
            </div>

            {/* Minimum investment */}
            <div className="text-sm text-gray-600">
                Minimum investment:{' '}
                <span className="font-medium">€{estate.configuration.price_per_share}</span>
            </div>

            {/* CTA Buy token */}
            <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-lg transition">
                Buy tokens
            </Button>

            <p className="text-xs text-gray-400">
                This investment is tokenized and compliant.
            </p>

            <div className="flex justify-end">
                <SocialMediaShare url={typeof window !== 'undefined' ? window.location.href : ''} />
            </div>

        </div>
    )
}
