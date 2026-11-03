import { type NextRequest, NextResponse } from "next/server";
import { decideRoute } from "@/lib/auth/routes";
import {
  ACCESS_COOKIE,
  decodeJwt,
  isExpired,
  REFRESH_COOKIE,
} from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const access = decodeJwt(request.cookies.get(ACCESS_COOKIE)?.value);
  const refresh = decodeJwt(request.cookies.get(REFRESH_COOKIE)?.value);
  // The access token is renewed client-side as long as the refresh token lives.
  const authenticated =
    !!access &&
    (!isExpired(access, 0) || (!!refresh && !isExpired(refresh, 0)));

  const decision = decideRoute(pathname, { authenticated, role: access?.role });
  if (decision.type === "next") return NextResponse.next();

  const url = new URL(decision.to, request.url);
  if (decision.withCallback) {
    url.searchParams.set("callbackUrl", `${pathname}${search}`);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
