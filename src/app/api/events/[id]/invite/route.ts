import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { inviteUserToEvent } from "@/services/events/events.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * POST /api/events/[id]/invite
 * Invite un ami à un événement
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ success: false, message: "Identifiant manquant." }, { status: 400 })
    }

    const sessionUserId = await getDughuUserIdFromCookies()
    const body = await request.json().catch(() => ({}))
    const userId = body.user_id || sessionUserId
    const userInviteId = body.user_invite_id

    if (!userId) {
      return NextResponse.json({ success: false, message: "Vous devez être connecté pour inviter des amis." }, { status: 401 })
    }

    if (!userInviteId) {
      return NextResponse.json({ success: false, message: "Identifiant de l'invité manquant." }, { status: 422 })
    }

    const result = await inviteUserToEvent(id, userId, String(userInviteId))
    return NextResponse.json(result)
  } catch (error) {
    console.error("EVENT INVITE ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Erreur lors de l'envoi de l'invitation."
    return NextResponse.json({ success: false, message }, { status })
  }
}
