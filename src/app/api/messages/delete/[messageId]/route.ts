import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { dughu, dughuApi, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/** Tire un message lisible depuis la donnée d'erreur upstream (peut être string, objet ou JSON). */
function upstreamMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data.trim()
  if (data && typeof data === "object") {
    const value = (data as { message?: unknown; error?: unknown }).message
      ?? (data as { message?: unknown; error?: unknown }).error
    if (typeof value === "string" && value.trim()) return value.trim()
    try {
      const parsed = JSON.stringify(data)
      if (parsed && parsed !== "{}") return parsed.length > 200 ? `${parsed.slice(0, 200)}…` : parsed
    } catch {
      /* ignore */
    }
  }
  return fallback
}

/**
 * Supprime un message existant.
 * Encapsule POST /deleteMessage/{message_id} (API Dughu).
 * Body attendu : { userId, targetUserId? }.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const { messageId } = await params
    const body = await req.json().catch(() => ({ userId: "", targetUserId: "", deleteType: "" }))

    if (!messageId) {
      return NextResponse.json({ success: false, message: "Identifiant du message requis." }, { status: 422 })
    }
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    let userId = String(body.userId || "")
    if (!userId) {
      userId = await getDughuUserIdFromCookies()
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 422 })
    }

    const authToken = (await cookies()).get("dughu_token")?.value || ""
    // "me" = supprimer uniquement pour soi ; "all" = supprimer pour tout le monde.
    // L'API Dughu marque les champs `deleted_one` / `deleted_two` en conséquence.
    const deleteType = body.deleteType === "me" ? "me" : "all"
    const dughuParams: Record<string, string | number | undefined> = {
      user_id: userId,
      sender_id: userId,
      message_id: String(messageId),
      delete_type: deleteType,
    }
    if (body.targetUserId) dughuParams.target_user_id = String(body.targetUserId)

    const raw = await dughuApi.deleteMessage(messageId, dughuParams, authToken || undefined)
    // L'API Dughu renvoie parfois une forme de succès sans champ `success`
    // ({}, {done:true}, {deleted:true}…) : on ne considère l'échec que sur `false` explicite.
    if (raw?.success === false) {
      console.error("DELETE MESSAGE REFUSED:", { messageId, userId, targetUserId: body.targetUserId, raw })
      return NextResponse.json(
        { success: false, message: raw?.message || "L'API Dughu a refusé la suppression.", upstream: raw },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true, message: raw?.message || "Message supprimé." })
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error)
    if (error instanceof DughuApiError) {
      const status = error.status === 401 || error.status === 403 ? 502 : error.status
      return NextResponse.json(
        {
          success: false,
          message: upstreamMessage(error.data, "L'API Dughu a refusé la suppression."),
          upstream: error.data,
          upstreamStatus: error.status,
        },
        { status }
      )
    }
    return NextResponse.json({ success: false, message: "Impossible de supprimer le message." }, { status: 502 })
  }
}