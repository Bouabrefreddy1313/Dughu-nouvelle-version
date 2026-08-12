import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const cookieStore = await cookies()
  const hasSession = !!cookieStore.get("next-auth.session-token")?.value
    || !!cookieStore.get("__Secure-next-auth.session-token")?.value

  // Si déjà connecté (session persistante), aller directement sur le fil de posts
  redirect(hasSession ? "/home" : "/register")
}