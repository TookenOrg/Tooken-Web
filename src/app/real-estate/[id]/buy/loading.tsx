export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Asset summary skeleton */}
                <div className="rounded-xl border p-4 space-y-3">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-6 w-2/3 bg-muted rounded" />
                    <div className="h-40 bg-muted rounded" />
                </div>

                {/* Purchase skeleton */}
                <div className="space-y-4">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-24 bg-muted rounded" />
                    <div className="h-16 bg-muted rounded" />
                    <div className="h-12 bg-muted rounded" />
                </div>
            </div>
        </div>
    )
}
