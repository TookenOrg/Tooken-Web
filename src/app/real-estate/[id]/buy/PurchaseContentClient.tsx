'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TokenAmountSelector } from "@/components/purchase/form/TokenAmountSelector"
import { PurchaseSummary } from "@/components/purchase/form/PurchaseSummary"
import { BuyTokensCTA } from "@/components/purchase/form/BuyTokensCTA"
import { RealEstate } from '@/types/real-estate/RealEstate'
import { toast } from "sonner"
import { PlaceIssuanceOrder } from "@/lib/api/order/issuance-order";

type PurchaseContentProps = {
    estate: RealEstate
}

export function PurchaseContent({ estate }: PurchaseContentProps) {
    const router = useRouter()

    const [tokenAmount, setTokenAmount] = useState(1)
    const [isLoading, setIsLoading] = useState(false)

    const handleBuy = async () => {
        setIsLoading(true)
        try {
            const response = await PlaceIssuanceOrder({
                realEstateId: estate.id,
                quantity: tokenAmount,
            })
            if (response.status === 201) {
                // redirect to details
                toast.info(response.message)
                router.push(`/user/orders/${response.orderReference}`)
                return
            }

            toast.error(response.message)
        } catch (error: any) {
            toast.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>

            {/* Purchase area */}
            <section className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-6">

                {/* token selector */}
                <div className="lg:col-span-2">
                    <TokenAmountSelector
                        asset={estate}
                        amount={tokenAmount}
                        onAmountChange={setTokenAmount}
                    />
                </div>

                <div className="lg:col-span-1">
                    <PurchaseSummary
                        asset={estate}
                        tokenAmount={tokenAmount}
                    />
                </div>

            </section>

            <section className="max-w-6xl mx-auto px-4 w-full md:pb-10">
                <BuyTokensCTA
                    asset={estate}
                    tokenAmount={tokenAmount}
                    onBuy={handleBuy}
                    isLoading={isLoading}
                />
            </section>
        </>
    )
}