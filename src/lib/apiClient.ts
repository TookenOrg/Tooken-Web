const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface FetchOptions extends RequestInit {
    skipAuth?: boolean;
}

export async function apiFetch(path: string, options: FetchOptions = {}) {
    const { skipAuth = false, headers, ...rest } = options;

    let token: string | null = null;
    if (!skipAuth && typeof window !== "undefined") {
        token = localStorage.getItem("TOKEN");
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.error || res.statusText || "API Error";

        if (res.status === 401 && !skipAuth && typeof window !== "undefined") {
            localStorage.removeItem("TOKEN");
        }

        throw new Error(message);
    }

    return res.json();
}
