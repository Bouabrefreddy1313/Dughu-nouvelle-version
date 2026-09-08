import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { listInvitedUsers } from "@/services/events/events.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * GET /api/events/[id]/invited
 * Récupère la liste des utilisateurs déjà invités à un événement
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ success: false, invitedUsers: [], message: "Identifiant manquant." }, { status: 400 })
    }

    const sessionUserId = await getDughuUserIdFromCookies()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id") || sessionUserId || "0"

    const result = await listInvitedUsers(id, userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("EVENT INVITED LIST ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible de charger la liste des invités."
    return NextResponse.json({ success: false, invitedUsers: [], message }, { status })
  }
}

/**
 * POST /api/events/[id]/invited (alias pour les clients envoyant un body)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return GET(request, context)
}
