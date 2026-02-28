'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RealEstate } from '@/types/real-estate/RealEstate'

type TokenAmountSelectorProps = {
    asset: RealEstate
    amount: number
    onAmountChange: (amount: number) => void
}

export function TokenAmountSelector({ asset, amount, onAmountChange }: TokenAmountSelectorProps) {
    const minAmount = 1
    const maxAmount = asset.configuration.total_shares - asset.progression.tokens_sold

    const handleIncrement = () => {
        if (amount < maxAmount) {
            onAmountChange(amount + 1)
        }
    }

    const handleDecrement = () => {
        if (amount > minAmount) {
            onAmountChange(amount - 1)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value)
        if (!isNaN(value) && value >= minAmount && value <= maxAmount) {
            onAmountChange(value)
        }
    }

    return (
        <div className="bg-card border rounded-lg p-6 space-y-6">
            <div>
                <h2 className="text-lg font-semibold mb-1">Number of tokens</h2>
                <p className="text-sm text-muted-foreground">
                    Select the number of tokens you want to purchase
                </p>
            </div>

            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDecrement}
                    disabled={amount <= minAmount}
                    className="h-12 w-12"
                >
                    <Minus className="h-4 w-4" />
                </Button>

                <Input
                    type="number"
                    value={amount}
                    onChange={handleInputChange}
                    min={minAmount}
                    max={maxAmount}
                    className="text-center text-xl font-semibold h-12"
                />

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleIncrement}
                    disabled={amount >= maxAmount}
                    className="h-12 w-12"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unit Price</span>
                <span className="font-medium">{asset.configuration.price_per_share}€</span>
            </div>

            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available Tokens</span>
                <span className="font-medium">{asset.configuration.total_shares - asset.progression.tokens_sold}</span>
            </div>
        </div>
    )
}