import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const cookieStore = await cookies()
  const hasSession = !!cookieStore.get("dughu_token")?.value
    || !!cookieStore.get("dughu_user_id")?.value

  // Si déjà connecté (session Dughu persistante), aller directement sur le fil
  redirect(hasSession ? "/home" : "/register")
}