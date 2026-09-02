import { NextRequest, NextResponse } from "next/server"
import { fetchUserBadges } from "@/services/badges/badges.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { userMessage } from "@/lib/api/api-error"

/**
 * Badges obtenus par un utilisateur — encapsule GET /badge/{userId} (API Dughu).
 * `userId` est l'ID Dughu numérique (ex. /api/badge/31262) ; à défaut, il est lu
 * depuis le cookie de session.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ userId?: string }> }) {
  try {
    const { userId } = await ctx.params
    const resolved = userId || (await getDughuUserIdFromCookies())
    if (!resolved) {
      return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
    }
    const data = await fetchUserBadges(resolved)
    return NextResponse.json(data)
  } catch (error) {
    console.error("USER BADGES ERROR:", error)
    return NextResponse.json(
      { success: false, message: userMessage(error, "Impossible de charger vos badges.") },
      { status: 500 }
    )
  }
}
