import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createActivity } from "@/lib/feed"

const REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry"]

export async function POST(req: NextRequest) {
  try {
    const { postId, userId, type = "like" } = await req.json()

    if (!postId || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    const reactionType = REACTION_TYPES.includes(type) ? type : "like"

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
