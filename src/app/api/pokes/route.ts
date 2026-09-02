import { NextRequest, NextResponse } from "next/server"
import { fetchPokes, sendPoke } from "@/services/pokes/pokes.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import type { PokesResponse } from "@/types/pokes/pokes.types"

export const dynamic = "force-dynamic"

/**
 * GET /api/pokes — liste des pokes de l'utilisateur connecté.
 * Query : ?box=received (défaut) | sent — encapsule GET /pokes?user_id=X
 * (pokes reçus) et GET /pokes/sent?user_id=X (pokes envoyés) de l'API Dughu.
 * L'user_id est lu du cookie de session (fallback : query ?user_id=).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const boxParam = String(searchParams.get("box") || "received")
    const box = boxParam === "sent" ? "sent" : "received"
    const userId = String(searchParams.get("user_id") || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json<PokesResponse>(
        { success: false, message: "Identifiant utilisateur requis.", pokes: [] },
        { status: 401 }
      )
    }

    const result = await fetchPokes(box, userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("POKES GET ERROR:", error)
    return NextResponse.json<PokesResponse>(
      { success: false, message: "Impossible de charger les pokes.", pokes: [] },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pokes — envoie un poke de l'utilisateur connecté vers un autre
 * utilisateur. Body JSON : { receivedUserId } (identifiant Dughu de la cible).
 * Encapsule POST /pokes { user_id, received_user_id } (API Dughu).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const receivedUserId = String(body?.receivedUserId || body?.received_user_id || "")
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Session requise pour envoyer un poke." },
        { status: 401 }
      )
    }
    if (!receivedUserId) {
      return NextResponse.json(
        { success: false, message: "Destinataire du poke requis." },
        { status: 422 }
      )
    }

    const poke = await sendPoke(userId, receivedUserId)
    return NextResponse.json({ success: true, message: "Poke envoyé avec succès ! 🎉", poke })
  } catch (error) {
    console.error("POKES SEND ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible d'envoyer le poke."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
