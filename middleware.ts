import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = ["/login", "/register", "/otp", "/forgot-password", "/api"]
const authRoutes = ["/login", "/register", "/otp", "/forgot-password"]

export function middleware(request: NextRequest) {
  const token =
    request.cookies.get("dughu_token")?.value ||
    request.cookies.get("dughu_user_id")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value
  
  const { pathname } = request.nextUrl

  // Si c'est une route API, laisser passer
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Si déjà connecté et sur une page auth → rediriger vers home
  if (token && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  // Si pas connecté et sur une route protégée → rediriger vers login
  if (!token && !publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
}