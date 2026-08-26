import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { dughu, dughuApi, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * Modifie un message existant.
 * Encapsule POST /updateMessage/{message_id} (API Dughu).
 * Body attendu : { userId, message }.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const { messageId } = await params
    const body = await req.json().catch(() => ({ userId: "", message: "", targetUserId: "" }))
    const message = String(body.message || "").trim()

    if (!messageId) {
      return NextResponse.json({ success: false, message: "Identifiant du message requis." }, { status: 422 })
    }
    if (!message) {
      return NextResponse.json({ success: false, message: "Le message ne peut pas être vide." }, { status: 422 })
    }
    if (message.length > 500) {
      return NextResponse.json({ success: false, message: "Le message ne peut pas dépasser 500 caractères." }, { status: 422 })
    }
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    let userId = String(body.userId || "")
    if (!userId) {
      // Fallback serveur : lecture du cookie de session Dughu
      userId = await getDughuUserIdFromCookies()
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 422 })
    }

    const authToken = (await cookies()).get("dughu_token")?.value || ""
    const dughuParams: Record<string, string | number | undefined> = {
      user_id: userId,
      sender_id: userId,
      message,
      message_id: String(messageId),
    }
    if (body.targetUserId) dughuParams.target_user_id = String(body.targetUserId)

    const raw = await dughuApi.updateMessage(messageId, dughuParams, authToken || undefined)
    // L'API Dughu renvoie parfois une forme de succès sans champ `success` :
    // on ne considère l'échec que sur `false` explicite.
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "L'API Dughu a refusé la modification.", upstream: raw },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true, message: raw?.message || "Message modifié." })
  } catch (error) {
    console.error("UPDATE MESSAGE ERROR:", error)
    if (error instanceof DughuApiError) {
      const status = error.status === 401 || error.status === 403 ? 502 : error.status
      return NextResponse.json(
        { success: false, message: "L'API Dughu a refusé la modification.", upstream: error.data },
        { status }
      )
    }
    return NextResponse.json({ success: false, message: "Impossible de modifier le message." }, { status: 502 })
  }
}