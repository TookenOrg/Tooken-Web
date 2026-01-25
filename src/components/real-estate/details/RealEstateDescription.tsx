import type { RealEstate } from "@/types/real-estate/RealEstate"

type Props = {
    estate: RealEstate
}

export function RealEstateDescription({ estate }: Props) {
    return (
        <section className="rounded-xl border bg-white p-6 space-y-4">
            <h2 className="text-xl font-semibold">
                About this investment
            </h2>

            <p className="text-gray-600 leading-relaxed">
                {estate.description}
            </p>

            {/* Beginner reassurance */}
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <p>
                    This real estate investment is fractionalized into tokens,
                    allowing you to invest smaller amounts while benefiting
                    from rental yields and potential asset appreciation.
                </p>
            </div>
        </section>
    )
}
