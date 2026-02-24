import { RealEstate } from "@/types/real-estate/RealEstate"
import { apiFetch } from "@/lib/apiClient"

export async function getActiveRealEstate(): Promise<RealEstate[]> {
    const rep = await apiFetch("/assets/real-estates/active", {
        method: "GET",
        skipAuth: true,
    })
    return rep
}

export async function getRealEstateById(id: string): Promise<RealEstate> {
    const rep = await apiFetch("/assets/real-estates/" + id, {
        method: "GET",
        skipAuth: true,
    })
    return rep
}