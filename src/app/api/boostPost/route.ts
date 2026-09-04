import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/** Tire un message lisible depuis la donnée d'erreur upstream (peut être string, objet ou JSON). */
function upstreamMessage(data: unknown, fallback = "Erreur lors du boost (API Dughu).."): string {
  if (typeof data === "string" && data.trim()) return data.trim()
  if (data && typeof data === "object") {
    const value = (data as { message?: unknown; error?: unknown }).message
      ?? (data as { message?: unknown; error?: unknown }).error
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return fallback
}

/**
 * POST /api/boostPost — boost d'une publication par son auteur.
 *
 * Contrat coté navigateur (payload JSON du service frontend) :
 *   { postId, userId, boostDays?, dughuUserId? }
 * Contrat coté API Dughu (POST /boostPost) :
 *   { post_id, user_id, boost_days }
 *
 * `user_id` transmis à Dughu = l'identifiant Dughu (session cookie en repli),
 * jamais l'identifiant interne de l'application.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const postId = String(body?.postId || body?.post_id || "")
    const userId = String(body?.userId || body?.user_id || "")
    // Durée de boost bornée : 1 à 30 jours, défaut 1.
    const boostDays = Math.min(
      Math.max(Number(body?.boostDays || body?.boost_days) || 1, 1),
      30
    )

    if (!postId || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }
    let dughuUserId = String(body?.dughuUserId || "")
    if (!dughuUserId) {
      // Fallback serveur : lecture du cookie de session Dughu
      dughuUserId = await getDughuUserIdFromCookies()
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    const raw = await dughuApi.boostPost({
      post_id: postId,
      user_id: dughuUserId,
      boost_days: boostDays,
    })
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur lors du boost (API Dughu)." },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true, boost_days: boostDays })
  } catch (error) {
    console.error("BOOST POST ERROR:", error)
    if (error instanceof DughuApiError) {
      const status = error.status === 401 || error.status === 403 ? 502 : error.status
      return NextResponse.json(
        {
          success: false,
          message: upstreamMessage(error.data),
          upstreamStatus: error.status,
        },
        { status }
      )
    }
    return NextResponse.json({ success: false, message: "Erreur lors du boost." }, { status: 500 })
  }
}