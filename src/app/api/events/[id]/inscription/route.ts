import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { toggleEventInscription } from "@/services/events/events.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * POST /api/events/[id]/inscription
 * Bascule l'inscription / adhésion d'un utilisateur à l'événement
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

    if (!userId) {
      return NextResponse.json({ success: false, message: "Vous devez être connecté pour participer." }, { status: 401 })
    }

    const result = await toggleEventInscription(id, userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("EVENT INSCRIPTION ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Erreur lors de l'inscription à l'événement."
    return NextResponse.json({ success: false, message }, { status })
  }
}
