import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

const REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry"]

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId, type = "like", isReply = false, dughuUserId: dughuUserIdParam } = await req.json()

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId requis." }, { status: 422 })
    }

    // ── Mode Dughu API : les commentaires/réponses Dughu ont un ID numérique ──
    if (dughu.enabled && /^\d+$/.test(String(id))) {
      let actingDughuUserId = String(dughuUserIdParam || "")
      if (!actingDughuUserId) {
        // Fallback serveur : lecture du cookie de session Dughu
        actingDughuUserId = await getDughuUserIdFromCookies()
      }
      if (!actingDughuUserId) {
        return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
      }
      try {
        const dForm = new FormData()
        dForm.append("user_id", String(actingDughuUserId))
        if (isReply) {
          dForm.append("reply_id", String(id))
        } else {
          dForm.append("comment_id", String(id))
        }
        dForm.append("type", type)
        dForm.append("reaction", String(REACTION_TYPES.indexOf(type) + 1))
        const raw = isReply ? await dughuApi.toggleLikeReply(dForm) : await dughuApi.toggleLikeComment(dForm)
        if (raw?.success) {
          const liked = !!raw.is_like
          return NextResponse.json({
            success: true,
            liked,
            type: liked ? type : null,
            likesCount: typeof raw?.count === "number" ? raw.count : undefined,
          })
        }
        return NextResponse.json({ success: false, message: raw?.message || "Erreur de réaction (API Dughu)." }, { status: 502 })
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU COMMENT LIKE ERROR:", err)
        return NextResponse.json({ success: false, message: "Erreur de réaction (API Dughu)." }, { status: 502 })
      }
    }

    // Aucun commentaire local : seuls les commentaires Dughu existent.
    return NextResponse.json({ success: false, message: "Commentaire introuvable." }, { status: 404 })
  } catch (error) {
    console.error("COMMENT LIKE ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
