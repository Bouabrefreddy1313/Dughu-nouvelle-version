import { NextResponse, type NextRequest } from "next/server"

// Routes publiques (accessibles sans session)
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/otp", "/api"]

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const dughuToken = request.cookies.get("dughu_token")?.value
  const dughuUserId = request.cookies.get("dughu_user_id")?.value

  const isPublic = PUBLIC_ROUTES.some((r) => path.startsWith(r))

  // Rediriger vers login si pas de session sur une route protégée
  if (!dughuToken && !dughuUserId && !isPublic && path !== "/") {
    return NextResponse.redirect(new URL("/register", request.url))
  }

  // Si déjà connecté via Dughu, aller directement sur /home (sauf si non onbording)
  if (dughuToken && dughuUserId && (path === "/login" || path === "/register" || path === "/" || path === "/otp")) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|images|favicon.ico|api).*)"],
}
