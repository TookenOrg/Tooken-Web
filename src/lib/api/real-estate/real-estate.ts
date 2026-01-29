import { RealEstate } from "@/types/real-estate/RealEstate"
import { apiFetch } from "@/lib/apiClient"

interface PlaceOrderPayload {
    realEstateId: number;
    tokenQuantity: number;
}

interface Order {
    id?: string;
    orderReference: string;
}

interface PlaceOrderResponse {
    orderReference?: string;
    message: string;
    status: number;
    data?: Order;
}

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

export async function PlaceOrder(request: PlaceOrderPayload): Promise<PlaceOrderResponse> {
    try {

        await new Promise(resolve => setTimeout(resolve, 500))

        if (!request.realEstateId || !request.tokenQuantity) {
            return {
                message: "Real-estate id and token quantity are required.",
                status: 400
            }
        }

        if (request.tokenQuantity < 1) {
            return {
                message: "Quantity must be at least 1",
                status: 400
            }
        }

        const rep = await apiFetch("/assets/real-estate", {
            method: "POST",
            body: JSON.stringify(request),
            skipAuth: false,
        });

        return {
            message: rep.message,
            status: 201,
            data: rep.data,
            orderReference: rep.data?.orderReference
        };


    } catch (error: any) {
        return {
            message: error.message || "An error occurred during the purchase.",
            status: error.status || 500
        }
    }
}