import { NextRequest, NextResponse } from "next/server"
import { flashEnabled, fetchUserFlash, FLASH_PAGE_SIZE } from "@/lib/flash-service"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * Stories Flash d'un utilisateur précis (profil / viewer dédié).
 * Encapsule GET /getUserStories (API Dughu, source de vérité).
 */
export async function GET(req: NextRequest) {
  try {
    if (!flashEnabled) {
      return NextResponse.json({ success: true, stories: [], pagination: { page: 1, perPage: FLASH_PAGE_SIZE, total: 0, hasMore: false } })
    }
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || (await getDughuUserIdFromCookies())
    const targetUserId = searchParams.get("targetUserId") || ""
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1)
    const perPage = Math.max(parseInt(searchParams.get("perPage") || String(FLASH_PAGE_SIZE), 10) || FLASH_PAGE_SIZE, 1)
    if (!targetUserId) {
      return NextResponse.json({ success: false, message: "targetUserId requis." }, { status: 422 })
    }
    const data = await fetchUserFlash(userId || targetUserId, targetUserId, { perPage, page })
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error("FLASH USER STORIES ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du chargement des Flash." }, { status: 500 })
  }
}