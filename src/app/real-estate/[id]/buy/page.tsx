
import { AssetSummaryCard } from "@/components/purchase/asset/AssetSummaryCard"
import { getRealEstateById } from '@/lib/api/real-estate/real-estate'
import { PurchaseContent } from "./PurchaseContentClient"


type BuyPageProps = {
    params: { id: string }
}

export default async function BuyRealEstatePage({ params }: BuyPageProps) {
    const { id } = await params
    const estate = await getRealEstateById(id)

    return (
        <main className="min-h-screen flex flex-col">
            <div className="flex-1 max-w-6xl mx-auto px-4 py-6 md:py-10 w-full space-y-6 md:space-y-10">

                {/* Asset recap avec image */}
                <section>
                    <AssetSummaryCard asset={estate} />
                </section>

                {/* Contenu dynamique de l'achat */}
                <PurchaseContent estate={estate} />

            </div>
        </main>

    )
}