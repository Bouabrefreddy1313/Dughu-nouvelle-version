import { NextResponse, type NextRequest } from "next/server"

// Routes publiques (accessibles sans session)
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/otp", "/api"]

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const token =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value

  const isPublic = PUBLIC_ROUTES.some((r) => path.startsWith(r))

  // Rediriger vers login si pas de session sur une route protégée
  if (!token && !isPublic && path !== "/") {
    return NextResponse.redirect(new URL("/register", request.url))
  }

  // Rediriger vers /home si déjà connecté et sur login/register
  if (token && (path === "/login" || path === "/register" || path === "/")) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|images|favicon.ico|api).*)"],
}
