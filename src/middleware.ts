import { NextResponse, type NextRequest } from "next/server"

// Routes publiques (accessibles sans session)
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/otp", "/api"]

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const token =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value
  const dughuToken = request.cookies.get("dughu_token")?.value
  const dughuUserId = request.cookies.get("dughu_user_id")?.value

  const isPublic = PUBLIC_ROUTES.some((r) => path.startsWith(r))

  // Rediriger vers login si pas de session sur une route protégée
  if (!token && !isPublic && path !== "/") {
    return NextResponse.redirect(new URL("/register", request.url))
  }

  // Si connecté via Dughu, rediriger selon l'état réel du profil.
  if (dughuToken && dughuUserId && (path === "/login" || path === "/register" || path === "/" || path === "/otp")) {
    return NextResponse.redirect(new URL("/api/auth/me", request.url))
  }

  // Compat legacy : si la vieille session NextAuth existe encore, on garde l'ancien comportement.
  if (token && (path === "/login" || path === "/register" || path === "/" || path === "/otp")) {
    return NextResponse.redirect(new URL("/onboarding/profile", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|images|favicon.ico|api).*)"],
}
