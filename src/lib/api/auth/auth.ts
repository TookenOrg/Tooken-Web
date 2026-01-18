import { apiFetch } from "@/lib/apiClient";

interface SignInPayload {
    email: string;
    password: string;
}

interface SignInResponse {
    token: string;
    refreshToken?: string;
    user?: any;
}

// Sign-in
export async function signIn(payload: SignInPayload): Promise<SignInResponse> {
    const rep = await apiFetch("/auth/sign-in", {
        method: "POST",
        body: JSON.stringify(payload),
        skipAuth: true,
    });

    console.log(rep.data)

    if (rep.data.token) localStorage.setItem("TOKEN", rep.data.token);
    if (rep.data.refreshToken) localStorage.setItem("REFRESH_TOKEN", rep.data.refreshToken);

    return rep;
}

// Logout
export function logout() {
    localStorage.removeItem("TOKEN");
    localStorage.removeItem("REFRESH_TOKEN");
}

// Refresh token
export async function refreshToken() {
    const refreshToken = localStorage.getItem("REFRESH_TOKEN");
    if (!refreshToken) throw new Error("No refresh token available");

    const rep = await apiFetch("/auth/refresh-token", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
    });

    if (rep.token) localStorage.setItem("TOKEN", rep.token);
    if (rep.refreshToken) localStorage.setItem("REFRESH_TOKEN", rep.refreshToken);

    return rep;
}
