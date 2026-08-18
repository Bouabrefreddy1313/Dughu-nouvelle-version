import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

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
        // Fallback serveur : résolution de l'ID Dughu depuis le compte local.
        actingDughuUserId = await resolveDughuUserIdFromLocalId(userId)
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

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId: id } },
    })

    if (existing) {
      // Si le même type de réaction → unlike (toggle)
      if (existing.type === type) {
        await prisma.commentLike.delete({ where: { id: existing.id } })
        const count = await prisma.commentLike.count({ where: { commentId: id } })
        return NextResponse.json({ success: true, liked: false, type: null, likesCount: count })
      }
      // Type différent → mettre à jour la réaction
      await prisma.commentLike.update({
        where: { id: existing.id },
        data: { type },
      })
      const count = await prisma.commentLike.count({ where: { commentId: id } })
      return NextResponse.json({ success: true, liked: true, type, likesCount: count })
    }

    // Pas encore liké → create
    await prisma.commentLike.create({ data: { userId, commentId: id, type } })
    const count = await prisma.commentLike.count({ where: { commentId: id } })
    return NextResponse.json({ success: true, liked: true, type, likesCount: count })
  } catch (error) {
    console.error("COMMENT LIKE ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
