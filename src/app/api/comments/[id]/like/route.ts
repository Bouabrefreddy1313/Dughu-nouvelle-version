import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId, type = "like" } = await req.json()

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId requis." }, { status: 422 })
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