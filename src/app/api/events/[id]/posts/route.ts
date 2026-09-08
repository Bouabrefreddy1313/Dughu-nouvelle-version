import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { getEventPosts } from "@/services/events/events.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * GET /api/events/[id]/posts
 * Récupère le flux de publications liées à un événement
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ success: false, posts: [], message: "Identifiant manquant." }, { status: 400 })
    }

    const sessionUserId = await getDughuUserIdFromCookies()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id") || sessionUserId || "0"

    const result = await getEventPosts(id, userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("EVENT POSTS GET ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible de charger les publications de l'événement."
    return NextResponse.json({ success: false, posts: [], message }, { status })
  }
}
