import { NextRequest, NextResponse } from "next/server"
import { fetchPagesPostsFeed } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * GET /api/pages/feed?page=N — fil d'actualité des publications des espaces
 * (API Dughu `getPostPageUser/{user_id}`, posts mappés comme le fil principal).
 * L'ID Dughu provient du paramètre `dughuUserId` ou du cookie de session.
 */
export async function GET(req: NextRequest) {
  try {
    const page = Math.max(Number(req.nextUrl.searchParams.get("page")) || 1, 1)
    let userId = String(req.nextUrl.searchParams.get("dughuUserId") || "")
    if (!userId) userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Connectez-vous pour consulter l'actualité des espaces.", posts: [], hasMore: false, page },
        { status: 401 }
      )
    }
    const result = await fetchPagesPostsFeed(userId, page)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES FEED ERROR:", error)
    return NextResponse.json(
      { success: false, message: "Impossible de charger l'actualité des espaces.", posts: [], hasMore: false, page: 1 },
      { status: 500 }
    )
  }
}