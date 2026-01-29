'use client'

import { useState } from 'react'
import HorizontalPurchaseStepper from "@/components/purchase/stepper/HorizontalPurchaseStepper"
import { TokenAmountSelector } from "@/components/purchase/form/TokenAmountSelector"
import { PurchaseSummary } from "@/components/purchase/form/PurchaseSummary"
import { BuyTokensCTA } from "@/components/purchase/form/BuyTokensCTA"
import { RealEstate } from '@/types/real-estate/RealEstate'

type PurchaseContentProps = {
    estate: RealEstate
}

export function PurchaseContent({ estate }: PurchaseContentProps) {
    const [tokenAmount, setTokenAmount] = useState(1)
    const [currentStep, setCurrentStep] = useState(0)

    const handleBuy = () => {
        // Passer à l'étape suivante
        if (currentStep < 2) {
            setCurrentStep(currentStep + 1)
        }
        // Ici vous pouvez ajouter la logique d'achat
        console.log('Achat de', tokenAmount, 'tokens')
    }

    const steps: Array<{ title: string; status: "completed" | "active" | "upcoming" }> = [
        { title: "Order", status: currentStep > 0 ? "completed" : "active" },
        { title: "Sent", status: currentStep === 1 ? "active" : currentStep > 1 ? "completed" : "upcoming" },
        { title: "Confirmed", status: currentStep === 2 ? "active" : "upcoming" },
    ]
    return (
        <>
            {/* Stepper */}
            <section>
                <HorizontalPurchaseStepper steps={steps} />
            </section>

            {/* Purchase area - prend toute la hauteur disponible */}
            <section className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-6">

                {/* Sélecteur de tokens */}
                <div className="lg:col-span-2">
                    <TokenAmountSelector
                        asset={estate}
                        amount={tokenAmount}
                        onAmountChange={setTokenAmount}
                    />
                </div>

                {/* Récapitulatif - sticky sur desktop */}
                <div className="lg:col-span-1">
                    <PurchaseSummary
                        asset={estate}
                        tokenAmount={tokenAmount}
                    />
                </div>

            </section>

            {/* CTA - En bas sur desktop, fixed sur mobile */}
            <section className="max-w-6xl mx-auto px-4 w-full md:pb-10">
                <BuyTokensCTA
                    asset={estate}
                    tokenAmount={tokenAmount}
                    onBuy={handleBuy}
                />
            </section>
        </>
    )
}