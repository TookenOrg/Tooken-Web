import { RealEstate } from "@/types/real-estate/RealEstate"
import { apiFetch } from "@/lib/apiClient"

export async function getActiveRealEstate(): Promise<RealEstate[]> {
    const rep = await apiFetch("/assets/real_estates/active", {
        method: "GET",
        skipAuth: true,
    })
    return rep
}
