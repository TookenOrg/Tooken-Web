'use client'

import { Button } from '@/components/ui/button'
import { Loader2, ShoppingCart } from 'lucide-react'
import { RealEstate } from '@/types/real-estate/RealEstate'

type BuyTokensCTAProps = {
    asset: RealEstate
    tokenAmount: number
    onBuy?: () => void
    isLoading?: boolean
    disabled?: boolean
}

export function BuyTokensCTA({ asset, tokenAmount, onBuy, isLoading = false, disabled = false }: BuyTokensCTAProps) {
    const total = asset.configuration.price_per_share * tokenAmount * 1.02 // avec frais

    const handleBuy = () => {
        if (onBuy) {
            onBuy()
        } else {
            console.log('Achat de', tokenAmount, 'tokens')
        }
    }

    return (
        <>
            {/* Desktop Version - bottom padding normal */}
            <div className="hidden md:block">
                <Button
                    size="lg"
                    className="w-full h-14 text-lg font-semibold bg-yellow-500 hover:bg-yellow-600 "
                    onClick={handleBuy}
                    disabled={disabled || isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <ShoppingCart className="mr-2 h-5 w-5" />
                            Buy for {total.toFixed(2)}€
                        </>
                    )}
                </Button>
            </div>

            {/* Mobile version - fixed bottom avec padding */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 pb-6 safe-area-bottom z-50">
                <Button
                    size="lg"
                    className="w-full h-14 text-lg font-semibold"
                    onClick={handleBuy}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <ShoppingCart className="mr-2 h-5 w-5" />
                            Buy {tokenAmount} token{tokenAmount > 1 ? 's' : ''} • {total.toFixed(2)}€
                        </>
                    )}
                </Button>
            </div >

            <div className="md:hidden h-24" />
        </>
    )
}