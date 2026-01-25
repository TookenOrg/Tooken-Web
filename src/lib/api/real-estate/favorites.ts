import { RealEstate } from "@/types/real-estate/RealEstate"
import { apiFetch } from "@/lib/apiClient"

export async function setFavorite(value: boolean): Promise<RealEstate[]> {
    const rep = await apiFetch("/assets/real_estates/active", {
        method: "GET",
        skipAuth: true,
    })
    return rep
}

export async function getRealEstateById(id: string): Promise<RealEstate> {
    console.log(id)
    const rep = await apiFetch("/assets/real_estates/" + id, {
        method: "GET",
        skipAuth: true,
    })
    return rep
}