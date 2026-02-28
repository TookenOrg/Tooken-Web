'use client'

import { RealEstate } from '@/types/real-estate/RealEstate'
import { Separator } from '@/components/ui/separator'

type PurchaseSummaryProps = {
    asset: RealEstate
    tokenAmount: number
}

export function PurchaseSummary({ asset, tokenAmount }: PurchaseSummaryProps) {
    const subtotal = asset.configuration.price_per_share * tokenAmount
    const fees = subtotal * 0.02 // 2% fees
    const total = subtotal + fees

    return (
        <div className="bg-card border rounded-lg p-6 space-y-4 sticky top-4">
            <h2 className="text-lg font-semibold">Summary</h2>

            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                        {tokenAmount} token{tokenAmount > 1 ? 's' : ''} × {asset.configuration.price_per_share}€
                    </span>
                    <span className="font-medium">{subtotal.toFixed(2)}€</span>
                </div>

                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Fee (2%)</span>
                    <span className="font-medium">{fees.toFixed(2)}€</span>
                </div>

                <Separator />

                <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold">{total.toFixed(2)}€</span>
                </div>
            </div>

            <div className="pt-2 space-y-2">
                <div className="text-xs text-muted-foreground">
                    <p>• Secure Payment</p>
                    <p>• Tokens Delivered Instantly</p>
                    <p>• No Hidden Fees</p>
                </div>
            </div>
        </div>
    )
}