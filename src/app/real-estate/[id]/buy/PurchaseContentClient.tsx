'use client'

import { useState } from 'react'
import HorizontalPurchaseStepper from "@/components/purchase/stepper/HorizontalPurchaseStepper"
import { TokenAmountSelector } from "@/components/purchase/form/TokenAmountSelector"
import { PurchaseSummary } from "@/components/purchase/form/PurchaseSummary"
import { BuyTokensCTA } from "@/components/purchase/form/BuyTokensCTA"
import { RealEstate } from '@/types/real-estate/RealEstate'
import { toast } from "sonner"
import { PlaceOrder } from "@/lib/api/real-estate/real-estate";

type PurchaseContentProps = {
    estate: RealEstate
}

export function PurchaseContent({ estate }: PurchaseContentProps) {
    const [tokenAmount, setTokenAmount] = useState(1)
    const [currentStep, setCurrentStep] = useState(0)
    const [isLoading, setIsLoading] = useState(false)

    const handleBuy = async () => {
        setIsLoading(true)
        try {
            const response = await PlaceOrder({
                realEstateId: estate.id,
                tokenQuantity: tokenAmount,
            })
            if (response.status === 201) {
                setCurrentStep(1)
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
            {/* Stepper */}
            <section>
                <HorizontalPurchaseStepper currentStep={currentStep} />
            </section>

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