import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi } from "@/lib/dughu"
import { createActivity } from "@/lib/feed"

const REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry"]

export async function POST(req: NextRequest) {
  try {
    const { postId, userId, type = "like" } = await req.json()

    if (!postId || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    const reactionType = REACTION_TYPES.includes(type) ? type : "like"
    const reactionId = REACTION_TYPES.indexOf(reactionType) + 1

    // ── Mode Dughu API : les posts Dughu ont un ID numérique ──
    if (dughu.enabled && /^\d+$/.test(String(postId))) {
      const actingUser = await prisma.user.findUnique({ where: { id: userId }, select: { dughuId: true } })
      if (!actingUser?.dughuId) {
        return NextResponse.json({ success: false, message: "Compte Dughu requis." }, { status: 404 })
      }
      try {
        const dForm = new FormData()
        dForm.append("user_id", String(actingUser.dughuId))
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
    }

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    })

    // Même type → suppression (toggle off)
    if (existing && existing.type === reactionType) {
      await prisma.like.delete({ where: { id: existing.id } })
      return NextResponse.json({
        success: true,
        reacted: false,
        type: null,
        count: await prisma.like.count({ where: { postId } }),
      })
    }

    // Type différent → remplacement
    if (existing) {
      await prisma.like.update({ where: { id: existing.id }, data: { type: reactionType } })
    } else {
      await prisma.like.create({ data: { userId, postId, type: reactionType } })
      void createActivity(userId, "reaction", postId)
    }

    return NextResponse.json({
      success: true,
      reacted: true,
      type: reactionType,
      count: await prisma.like.count({ where: { postId } }),
    })
  } catch (error) {
    console.error("REACTION ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
