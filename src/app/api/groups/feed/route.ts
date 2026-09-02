import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { fetchPublicGroupFeed } from "@/services/groups/groups.server"
import type { GroupFeedResponse } from "@/types/groups/group-feed.types"

export const dynamic = "force-dynamic"

function emptyResponse(message: string): GroupFeedResponse {
  return {
    success: false,
    message,
    posts: [],
    pagination: {
      currentPage: 1,
      perPage: 0,
      total: 0,
      lastPage: 1,
      hasMore: false,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json(emptyResponse("Votre session a expiré. Veuillez vous reconnecter."), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
    const searchTerm = (searchParams.get("searchTerm") || "").trim().slice(0, 100)
    const result = await fetchPublicGroupFeed({ userId, page, searchTerm })
    return NextResponse.json(result)
  } catch (error) {
    console.error("GROUP FEED ERROR:", error)
    return NextResponse.json(
      emptyResponse("Impossible de charger les actualités des groupes."),
      { status: 500 }
    )
  }
}