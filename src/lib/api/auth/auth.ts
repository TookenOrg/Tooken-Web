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

    if (rep.data.token) {
        localStorage.setItem("TOKEN", rep.data.token);
        document.cookie = `TOKEN=${rep.data.token}; path=/; max-age=3600; SameSite=Strict`;
    }

    if (rep.data.refreshToken) localStorage.setItem("REFRESH_TOKEN", rep.data.refreshToken);

    return rep;
}

// Logout
export function logout() {
    localStorage.removeItem("TOKEN");
    localStorage.removeItem("REFRESH_TOKEN");
    document.cookie = "TOKEN=; path=/; max-age=0; SameSite=Strict";
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

    if (rep.token) {
        localStorage.setItem("TOKEN", rep.token);
        document.cookie = `TOKEN=${rep.token}; path=/; max-age=3600; SameSite=Strict`;
    }

    if (rep.refreshToken) localStorage.setItem("REFRESH_TOKEN", rep.refreshToken);

    return rep;
}
