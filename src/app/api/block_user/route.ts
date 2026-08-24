import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * Bloque (ou débloque) un utilisateur.
 * Encapsule POST /block_user (API Dughu) — { auth_user_id, user_id }.
 * Le endpoint Dughu fait office de toggle : un second appel avec les mêmes
 * identifiants débloque l'utilisateur.
 */
export async function POST(req: NextRequest) {
  try {
    const { authorId, userId, dughuUserId: dughuUserIdParam } = await req.json()

    if (!authorId || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }
    let dughuUserId = String(dughuUserIdParam || "")
    if (!dughuUserId) {
      // Fallback serveur : lecture du cookie de session Dughu
      dughuUserId = await getDughuUserIdFromCookies()
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    const raw = await dughuApi.blockUser(dughuUserId, authorId)
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur lors du blocage (API Dughu)." },
        { status: 502 }
      )
    }
    const blocked = raw?.blocked ?? raw?.is_blocked ?? true
    return NextResponse.json({ success: true, blocked: !!blocked })
  } catch (error) {
    console.error("BLOCK USER ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du blocage." }, { status: 500 })
  }
}