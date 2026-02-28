
import { apiFetch } from "@/lib/apiClient"

interface SubscribeOrderPayload {
    realEstateId: number;
    quantity: number;
}

interface SubscribeOrderResponse {
    orderReference?: string;
    message: string;
    status: number;
    data?: Order;
}

interface Order {
    id?: string;
    orderRef: string;
    createdAt: Date;
    updatedAt?: Date;
    realEstateId: number;
    statusCode?: string;
    statusId?: number;
    statusIfFinal?: boolean;
    statusLabel?: string;
    tokenQuantity: number;
    userId: number;
}


export async function PlaceIssuanceOrder(request: SubscribeOrderPayload): Promise<SubscribeOrderResponse> {
    try {
        await new Promise(resolve => setTimeout(resolve, 500))

        if (!request.realEstateId || !request.quantity) {
            return {
                message: "Real-estate id and token quantity are required.",
                status: 400
            }
        }

        if (request.quantity < 1) {
            return {
                message: "Quantity must be at least 1",
                status: 400
            }
        }

        const rep = await apiFetch("/assets/real-estate/issuance/orders", {
            method: "POST",
            body: JSON.stringify(request),
            skipAuth: false,
        });

        return {
            message: rep.message,
            status: 201,
            data: rep.data,
            orderReference: rep.data?.orderRef
        };


    } catch (error: any) {
        return {
            message: error.message || "An error occurred during the purchase.",
            status: error.status || 500
        }
    }
}

export async function GetIssuanceOrderByOrderRef(orderRef: string): Promise<Order> {
    const rep = await apiFetch("/assets/real-estate/issuance/orders/" + orderRef, {
        method: "GET",
        skipAuth: false,
    });

    return rep.data;
}