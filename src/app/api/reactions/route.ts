import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

const REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry"]

export async function POST(req: NextRequest) {
  try {
    const { postId, userId, type = "like", dughuUserId: dughuUserIdParam } = await req.json()

    if (!postId || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    const reactionType = REACTION_TYPES.includes(type) ? type : "like"
    const reactionId = REACTION_TYPES.indexOf(reactionType) + 1

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // ── Mode Dughu API (source de vérité) ──
    let dughuUserId = String(dughuUserIdParam || "")
    if (!dughuUserId) {
      // Fallback serveur : lecture du cookie de session Dughu
      dughuUserId = await getDughuUserIdFromCookies()
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }
    try {
      const dForm = new FormData()
      dForm.append("user_id", String(dughuUserId))
      dForm.append("post_id", String(postId))
      dForm.append("reaction", String(reactionId))
      const raw = await dughuApi.toggleLikePost(dForm)
      if (raw?.success) {
        const reacted = !!raw.is_like
        const currentReactionId = raw?.reaction?.reaction
        const currentType = currentReactionId ? REACTION_TYPES[Number(currentReactionId) - 1] || reactionType : reactionType
        return NextResponse.json({
          success: true,
          reacted,
          type: reacted ? currentType : null,
          count: typeof raw?.count === "number" ? raw.count : undefined,
        })
      }
      return NextResponse.json({ success: false, message: raw?.message || "Erreur de réaction (API Dughu)." }, { status: 502 })
    } catch (err) {
      if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
      console.error("DUGHU TOGGLE LIKE ERROR:", err)
      return NextResponse.json({ success: false, message: "Erreur de réaction (API Dughu)." }, { status: 502 })
    }
  } catch (error) {
    console.error("REACTION ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}