type Props = {
    children: React.ReactNode
}

export function AssetPurchaseLayout({ children }: Props) {
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {children}
            </div>
        </div>
    )
}
