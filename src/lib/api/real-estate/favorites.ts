import { RealEstate } from "@/types/real-estate/RealEstate"
import { apiFetch } from "@/lib/apiClient"

export async function setFavorite(value: boolean): Promise<RealEstate[]> {
    const rep = await apiFetch("/assets/real_estates/active", {
        method: "POST",
        skipAuth: true,
    })
    return rep
}

export async function getRealEstateById(id: string): Promise<RealEstate> {
    const rep = await apiFetch("/assets/real_estates/" + id, {
        method: "GET",
        skipAuth: true,
    })
    return rep
}