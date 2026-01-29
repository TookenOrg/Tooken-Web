'use client'

type Props = {
    error: Error
    reset: () => void
}

export default function Error({ error, reset }: Props) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-xl font-semibold">
                Something went wrong
            </h2>

            <p className="text-sm text-muted-foreground">
                {error.message}
            </p>

            <button
                onClick={reset}
                className="rounded-lg bg-primary px-4 py-2 text-white"
            >
                Try again
            </button>
        </div>
    )
}
