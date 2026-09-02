import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { fetchUserGroups } from "@/services/groups/groups.server"
import type { UserGroupsResponse } from "@/types/groups/user-groups.types"

export const dynamic = "force-dynamic"

function emptyResponse(message: string): UserGroupsResponse {
  return {
    success: false,
    message,
    groups: [],
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
    return NextResponse.json(await fetchUserGroups({ userId, page, searchTerm }))
  } catch (error) {
    console.error("USER GROUPS ERROR:", error)
    return NextResponse.json(emptyResponse("Impossible de charger vos groupes."), { status: 500 })
  }
}