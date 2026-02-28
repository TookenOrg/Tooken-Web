import { NextRequest, NextResponse } from "next/server";

// Routes protected - Must be connected
const protectedRoutes = [
    /^\/real-estate\/[^/]+\/buy$/,
    /^\/user/,
];

// Accessible routes
const authRoutes = [
    "/sign-in",
    "/sign-up",
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("TOKEN")?.value;

    const isProtected = protectedRoutes.some(route => route.test(pathname));
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    // Non connecté sur une route protégée → redirect sign-in avec callbackUrl
    if (isProtected && !token) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(signInUrl);
    }

    // Déjà connecté sur sign-in ou sign-up → redirect accueil
    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};