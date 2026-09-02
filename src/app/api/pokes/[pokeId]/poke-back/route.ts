import { NextRequest, NextResponse } from "next/server"
import { pokeBack } from "@/services/pokes/pokes.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * POST /api/pokes/[pokeId]/poke-back — répond à un poke reçu en envoyant un
 * poke en retour. Body JSON : { receivedUserId } = l'expéditeur ORIGINAL du
 * poke (l'API Dughu exige `received_user_id`).
 *
 * Encapsule POST /pokes/{pokeId}/poke-back { user_id, received_user_id }
 * (API Dughu). L'user_id est lu du cookie de session (fallback : body).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ pokeId?: string }> }) {
  try {
    const { pokeId } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const receivedUserId = String(body?.receivedUserId || body?.received_user_id || "")
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Session requise pour répondre à un poke." },
        { status: 401 }
      )
    }
    if (!pokeId || !receivedUserId) {
      return NextResponse.json(
        { success: false, message: "Poke et expéditeur requis pour répondre." },
        { status: 422 }
      )
    }

    const poke = await pokeBack(pokeId, userId, receivedUserId)
    return NextResponse.json({ success: true, message: "Poke de réponse envoyé avec succès ! 🎉", poke })
  } catch (error) {
    console.error("POKES POKE-BACK ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de répondre à ce poke."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
