import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuTokenFromCookies, getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const dughuUserId = await getDughuUserIdFromCookies()

  // Déconnexion du côté Dughu (best-effort : ne bloque jamais la déconnexion)
  if (dughu.enabled) {
    try {
      await dughuApi.sessionsDestroy().catch(() => {})
    } catch { /* silencieux */ }
    if (dughuUserId) {
      try {
        await dughuApi.mobileTokenUser(dughuUserId, "logout").catch(() => {})
      } catch { /* silencieux */ }
    }
  }

  const response = NextResponse.json({ success: true, message: "Déconnecté" })
  response.cookies.set("dughu_token", "", { maxAge: 0, path: "/" })
  response.cookies.set("dughu_user_id", "", { maxAge: 0, path: "/" })

  return response
}