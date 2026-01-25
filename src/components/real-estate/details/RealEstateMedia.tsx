import Image from "next/image"
import type { RealEstate } from "@/types/real-estate/RealEstate"

type Props = {
    estate: RealEstate
}

export function RealEstateMedia({ estate }: Props) {
    console.log(estate)
    return (
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-gray-100">
            {estate.imageurl ? (
                <Image
                    src={estate.imageurl}
                    alt={estate.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                />
            ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                    No image available
                </div>
            )}
        </div>
    )
}
