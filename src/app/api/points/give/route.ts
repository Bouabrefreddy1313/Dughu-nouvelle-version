import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * Offre des points à l'auteur d'une publication.
 * Encapsule POST /points/give (API Dughu) :
 *   { user_id: destinataire (l'auteur du post),
 *     user_offer_id: utilisateur connecté qui offre les points,
 *     points: montant, post_id: la publication }
 */
export async function POST(req: NextRequest) {
  try {
    const { postId, authorId, points, userId, dughuUserId: dughuUserIdParam } = await req.json()

    const parsedPoints = Math.trunc(Number(points))
    if (!postId || !authorId || !userId || !Number.isFinite(parsedPoints) || parsedPoints <= 0) {
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

    const raw = await dughuApi.givePoints({
      user_id: String(authorId),
      user_offer_id: String(dughuUserId),
      points: String(parsedPoints),
      post_id: String(postId),
    })
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur lors du don de points (API Dughu)." },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("GIVE POINTS ERROR:", error)
    if (error instanceof DughuApiError) {
      const apiData = error.data as Record<string, unknown> | string | null
      let apiMessage: string | undefined
      if (typeof apiData === "object" && apiData !== null) {
        apiMessage =
          (apiData.message as string) ||
          (apiData.error as string) ||
          (apiData.msg as string) ||
          (apiData.error_msg as string) ||
          (apiData.errors as string)
      } else if (typeof apiData === "string" && apiData) {
        apiMessage = apiData
      }
      return NextResponse.json(
        {
          success: false,
          message: apiMessage || `Erreur API Dughu (${error.status}).`,
        },
        { status: 502 }
      )
    }
    return NextResponse.json(
      { success: false, message: "Erreur lors du don de points." },
      { status: 500 }
    )
  }
}